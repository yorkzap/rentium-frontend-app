// PropertyForm.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  DoorOpen,
  Eye,
  EyeOff,
  Home,
  ImageIcon,
  Loader2,
  Sofa,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  ApiError,
  BUILDING_AMENITIES,
  PropertyCategory,
  PropertyDetail,
  PropertyGroupStub,
  PropertyStatus,
  ROOM_TYPES,
  RoomType,
  STATUSES,
  UNIT_TYPES,
  UnitType,
  addGalleryImage,
  createProperty,
  fetchGroups,
  fetchProperty,
  updateProperty,
  uploadPrimaryImage,
} from '@/lib/propertyApi';
import AddressInput, { ResolvedAddress } from '@/components/form/AddressInput';
import {
  CardChoice,
  CheckboxRow,
  Field,
  NumberInput,
  Select,
  TextArea,
  TextInput,
} from '@/components/form/Fields';
import { PageHeader, Skeleton } from '@/components/ui/page';

/**
 * ONE property form. Create and edit were two separate ~1,000-line files
 * implementing the same thing twice — different fields, different validation,
 * different bugs (the edit form's `assign_group_id` had a queryset that did
 * nothing; the create form's province was free text). Two implementations of one
 * form is two forms to keep in sync, and they weren't.
 *
 * What the landlord is asked for, and — more importantly — what they aren't:
 *
 *   ASKED       name, what kind of place, the street address, size, price,
 *               photos, status.
 *
 *   NOT ASKED   city, province, postal code, neighbourhood, coordinates — all
 *               derived from the address they picked (see AddressInput).
 *               Furnished — derived from their inventory. Asking a landlord to
 *               tick "furnished" when we can already see they've listed a bed is
 *               asking them to tell us something we know, and giving them the
 *               chance to be wrong about it.
 */

interface Props {
  propertyId?: number | string; // absent = create
}

interface FormState {
  name: string;
  description: string;
  property_category: PropertyCategory | '';
  unit_type: UnitType | '';
  room_type: RoomType | '';
  group_id: string;
  bedrooms: string;
  bathrooms: string;
  max_occupancy: string;
  square_footage: string;
  building_amenities: string[];
  asking_rent: string;
  available_from: string;
  status: PropertyStatus;
  is_publicly_visible: boolean;
  neighbourhood: string;
}

const EMPTY: FormState = {
  name: '',
  description: '',
  property_category: '',
  unit_type: '',
  room_type: '',
  group_id: '',
  bedrooms: '',
  bathrooms: '',
  max_occupancy: '',
  square_footage: '',
  building_amenities: [],
  asking_rent: '',
  available_from: '',
  status: 'AVAILABLE',
  is_publicly_visible: true,
  neighbourhood: '',
};

export default function PropertyForm({ propertyId }: Props) {
  const router = useRouter();
  const { token } = useAuth();
  const isEdit = propertyId !== undefined;

  const [form, setForm] = useState<FormState>(EMPTY);
  const [address, setAddress] = useState<ResolvedAddress | null>(null);
  const [existing, setExisting] = useState<PropertyDetail | null>(null);
  const [groups, setGroups] = useState<PropertyGroupStub[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  // images
  const [primaryFile, setPrimaryFile] = useState<File | null>(null);
  const [primaryPreview, setPrimaryPreview] = useState<string | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [k as string]: _, ...rest } = e;
      return rest;
    });
  };

  // ------------------------------------------------------------------- load
  useEffect(() => {
    if (!token) return;
    fetchGroups(token)
      .then(setGroups)
      .catch(() => setGroups([]));
  }, [token]);

  useEffect(() => {
    if (!token || !isEdit) return;
    fetchProperty(token, propertyId!)
      .then((p) => {
        setExisting(p);
        setForm({
          name: p.name,
          description: p.description ?? '',
          property_category: p.property_category,
          unit_type: p.unit_type ?? '',
          room_type: p.room_type ?? '',
          group_id: p.group_id ?? '',
          bedrooms: p.bedrooms?.toString() ?? '',
          bathrooms: p.bathrooms ?? '',
          max_occupancy: p.max_occupancy?.toString() ?? '',
          square_footage: p.square_footage?.toString() ?? '',
          building_amenities: p.building_amenities ?? [],
          asking_rent: p.asking_rent ?? '',
          available_from: p.available_from ?? '',
          status: p.status,
          is_publicly_visible: p.is_publicly_visible,
          neighbourhood: p.neighbourhood ?? '',
        });
        // An existing property already has a resolved address. Reconstruct it so
        // the confirmation panel shows what we know, and the landlord only has to
        // re-pick if they're actually MOVING the property.
        if (p.address) {
          setAddress({
            address: p.address,
            city: p.city,
            province: p.province,
            province_code: p.province,
            postal_code: p.postal_code,
            neighbourhood: p.neighbourhood,
            latitude: Number(p.latitude ?? 0),
            longitude: Number(p.longitude ?? 0),
            label: [p.address, p.city, p.province.toUpperCase(), p.postal_code]
              .filter(Boolean)
              .join(', '),
          });
        }
        setPrimaryPreview(p.primary_image);
      })
      .catch(() => toast.error("Couldn't load that property."))
      .finally(() => setLoading(false));
  }, [token, propertyId, isEdit]);

  const isRoom = form.property_category === 'ROOM';
  const isUnit = form.property_category === 'COMPLETE_UNIT';

  // ----------------------------------------------------------------- submit
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 3)
      e.name = 'Give it a name people will recognise.';
    if (!form.property_category) e.property_category = 'Pick one.';
    if (!address)
      e.address = 'Pick an address from the list so we can find it on a map.';
    if (isUnit && !form.unit_type) e.unit_type = 'What kind of unit is it?';
    if (isRoom && !form.room_type) e.room_type = 'Private or shared?';
    if (form.asking_rent && Number(form.asking_rent) <= 0)
      e.asking_rent = 'Must be more than $0.';
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error('A couple of things need fixing.');
      return false;
    }
    return true;
  };

  const submit = async () => {
    if (!token || !validate() || !address) return;
    setSaving(true);
    setErrors({});

    const body: Record<string, unknown> = {
      name: form.name.trim(),
      description: form.description.trim(),
      property_category: form.property_category,

      // Location, all of it derived from the one address they picked.
      address: address.address,
      city: address.city,
      province: address.province_code,
      postal_code: address.postal_code,
      country: 'Canada',
      // The neighbourhood is the ONLY location a stranger ever sees, so if the
      // landlord overrode the geocoder's guess, theirs wins.
      neighbourhood: form.neighbourhood || address.neighbourhood,

      status: form.status,
      is_publicly_visible: form.is_publicly_visible,
      max_occupancy: form.max_occupancy ? Number(form.max_occupancy) : null,
      square_footage: form.square_footage ? Number(form.square_footage) : null,
      // Money as a fixed-2 STRING, never a JS number. A JSON float can carry
      // binary representation error for values like 1234.565; DRF's DecimalField
      // parses a string exactly.
      asking_rent: form.asking_rent
        ? Number(form.asking_rent).toFixed(2)
        : null,
      available_from: form.available_from || null,
    };

    if (isUnit) {
      body.unit_type = form.unit_type;
      body.bedrooms = form.bedrooms ? Number(form.bedrooms) : null;
      body.bathrooms = form.bathrooms ? Number(form.bathrooms) : null;
      body.building_amenities = form.building_amenities;
      // A complete unit is self-contained and cannot belong to a group. The
      // backend enforces this in clean(); sending it anyway would just 400.
      body.assign_group_id = null;
    } else {
      body.room_type = form.room_type;
      body.assign_group_id = form.group_id || null;
      body.building_amenities = [];
    }

    try {
      const saved = isEdit
        ? await updateProperty(token, propertyId!, body)
        : await createProperty(token, body);

      // Images go up after the row exists — they need an id to attach to.
      if (primaryFile) await uploadPrimaryImage(token, saved.id, primaryFile);
      for (const f of galleryFiles) {
        try {
          await addGalleryImage(token, saved.id, f);
        } catch {
          toast.error(
            `Couldn't upload ${f.name} — you can add it from the property page.`
          );
        }
      }

      toast.success(isEdit ? 'Saved.' : 'Property added.');
      router.push(`/dashboard/properties/${saved.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.errors.fields);
        toast.error(
          err.errors.detail ?? "Couldn't save — check the highlighted fields."
        );
      } else {
        toast.error("Couldn't save.");
      }
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-8 w-56" />
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <PageHeader
        title={isEdit ? 'Edit property' : 'Add a property'}
        breadcrumbs={[
          { label: 'Properties', href: '/dashboard/properties' },
          { label: isEdit ? form.name || 'Edit' : 'New' },
        ]}
        actions={
          <Link
            href={
              isEdit
                ? `/dashboard/properties/${propertyId}`
                : '/dashboard/properties'
            }
            className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-[hsl(var(--surface-sunken))]"
            style={{ borderColor: 'hsl(var(--line))' }}
          >
            <ArrowLeft className="h-4 w-4" /> Cancel
          </Link>
        }
      />

      {/* Why it can't be published — shown here, while they're in the form and can
          fix it, not discovered three weeks later when nobody has enquired. */}
      {isEdit && existing && existing.publish_blockers.length > 0 && (
        <div className="card mb-6 border-[hsl(var(--warn))] bg-[hsl(var(--warn-soft))] p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--warn-ink))]">
            <AlertTriangle className="h-4 w-4" /> This won&apos;t show up
            publicly yet
          </p>
          <ul className="mt-2 space-y-1">
            {existing.publish_blockers.map((b) => (
              <li key={b} className="text-xs text-[hsl(var(--warn-ink))]">
                — {b}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-6">
        {/* --------------------------------------------------------- basics */}
        <section className="card p-5">
          <h2 className="mb-4 font-semibold">The basics</h2>
          <div className="space-y-4">
            <Field
              label="Name"
              required
              error={errors.name}
              hint="Just for you — how you'll recognise it in your list."
            >
              <TextInput
                value={form.name}
                onChange={(v) => set('name', v)}
                placeholder="e.g. McKenzie Room A"
                error={errors.name}
              />
            </Field>

            <Field
              label="What kind of place is it?"
              required
              error={errors.property_category}
            >
              <CardChoice<PropertyCategory>
                value={form.property_category}
                onChange={(v) => {
                  set('property_category', v);
                  // Switching category invalidates the other category's fields.
                  // The backend rejects a room with a unit_type, so silently
                  // carrying stale values across is a guaranteed 400 later.
                  if (v === 'ROOM') {
                    set('unit_type', '');
                    set('bedrooms', '');
                    set('bathrooms', '');
                    set('building_amenities', []);
                  } else {
                    set('room_type', '');
                    set('group_id', '');
                  }
                }}
                options={[
                  {
                    value: 'COMPLETE_UNIT',
                    label: 'Complete unit',
                    hint: 'Self-contained — its own kitchen, bathroom and entrance',
                    icon: Home,
                  },
                  {
                    value: 'ROOM',
                    label: 'Room',
                    hint: 'One room in a shared home; kitchen and bathroom are shared',
                    icon: DoorOpen,
                  },
                ]}
              />
            </Field>

            <Field
              label="Description"
              hint="What makes it worth living in? This is what shows publicly."
            >
              <TextArea
                value={form.description}
                onChange={(v) => set('description', v)}
                rows={4}
                placeholder="Bright top-floor room with a bay window, five minutes' walk from the bus loop..."
              />
            </Field>
          </div>
        </section>

        {/* -------------------------------------------------------- address */}
        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Where it is</h2>
          <AddressInput
            value={address}
            onChange={setAddress}
            error={errors.address}
          />

          {address && (
            <div className="mt-4">
              <Field
                label="Neighbourhood shown publicly"
                hint="This is what strangers see instead of your street address. Clear it to show only the city."
              >
                <TextInput
                  value={form.neighbourhood || address.neighbourhood}
                  onChange={(v) => set('neighbourhood', v)}
                  placeholder={address.neighbourhood || address.city}
                />
              </Field>
            </div>
          )}
        </section>

        {/* --------------------------------------------------------- details */}
        {form.property_category && (
          <section className="card p-5">
            <h2 className="mb-4 font-semibold">Details</h2>
            <div className="space-y-4">
              {isUnit && (
                <>
                  <Field label="Unit type" required error={errors.unit_type}>
                    <Select<UnitType>
                      value={form.unit_type}
                      onChange={(v) => set('unit_type', v)}
                      options={UNIT_TYPES}
                      placeholder="Select..."
                      error={errors.unit_type}
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Bedrooms">
                      <NumberInput
                        value={form.bedrooms}
                        onChange={(v) => set('bedrooms', v)}
                        min="0"
                        step="1"
                        placeholder="2"
                      />
                    </Field>
                    <Field label="Bathrooms" hint="0.5 for a half bath">
                      <NumberInput
                        value={form.bathrooms}
                        onChange={(v) => set('bathrooms', v)}
                        min="0"
                        step="0.5"
                        placeholder="1.5"
                      />
                    </Field>
                  </div>

                  <Field
                    label="Shared with other units in the building"
                    hint="A complete unit is self-contained — the only things it shares are building facilities."
                  >
                    <div className="grid gap-2 sm:grid-cols-2">
                      {BUILDING_AMENITIES.map((a) => (
                        <CheckboxRow
                          key={a.value}
                          checked={form.building_amenities.includes(a.value)}
                          onChange={(on) =>
                            set(
                              'building_amenities',
                              on
                                ? [...form.building_amenities, a.value]
                                : form.building_amenities.filter(
                                    (x) => x !== a.value
                                  )
                            )
                          }
                          label={a.label}
                        />
                      ))}
                    </div>
                  </Field>
                </>
              )}

              {isRoom && (
                <>
                  <Field label="Room type" required error={errors.room_type}>
                    <CardChoice<RoomType>
                      value={form.room_type}
                      onChange={(v) => set('room_type', v)}
                      options={ROOM_TYPES.filter((r) => r.value !== 'OTHER')}
                    />
                  </Field>

                  <Field
                    label="Property group"
                    hint="The suite this room is in. Rooms in a group share its common areas — kitchen, bathroom, living room — and that's where you say whether you share them too."
                  >
                    <Select
                      value={form.group_id}
                      onChange={(v) => set('group_id', v)}
                      options={groups.map((g) => ({
                        value: g.id,
                        label: g.name,
                      }))}
                      placeholder="Not in a group"
                    />
                    {groups.length === 0 && (
                      <p className="mt-1.5 text-xs text-[hsl(var(--ink-4))]">
                        No groups yet.{' '}
                        <Link
                          href="/dashboard/properties/create?type=group"
                          className="text-[hsl(var(--brand))] hover:underline"
                        >
                          Create one
                        </Link>{' '}
                        to describe the shared kitchen and bathroom.
                      </p>
                    )}
                  </Field>
                </>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Max occupancy">
                  <NumberInput
                    value={form.max_occupancy}
                    onChange={(v) => set('max_occupancy', v)}
                    min="1"
                    step="1"
                    placeholder="2"
                  />
                </Field>
                <Field label="Size">
                  <NumberInput
                    value={form.square_footage}
                    onChange={(v) => set('square_footage', v)}
                    min="1"
                    step="1"
                    placeholder="150"
                    suffix="sq ft"
                  />
                </Field>
              </div>

              {/* Furnished is DERIVED, so it is stated, not asked. Asking a
                  landlord to tick a box we can already answer from their own
                  inventory is asking them to tell us something we know — and
                  giving them the opportunity to be wrong about it. */}
              {isEdit && existing && (
                <div className="flex items-start gap-3 rounded-lg bg-[hsl(var(--surface-sunken))] p-3">
                  <Sofa className="mt-0.5 h-4 w-4 flex-shrink-0 text-[hsl(var(--ink-4))]" />
                  <div className="text-sm">
                    <p className="font-medium">
                      {existing.is_furnished
                        ? 'Listed as furnished'
                        : 'Listed as unfurnished'}
                    </p>
                    <p className="mt-0.5 text-xs text-[hsl(var(--ink-4))]">
                      We work this out from your inventory — a room counts as
                      furnished once there&apos;s something to sleep on in it.{' '}
                      <Link
                        href="/dashboard/inventory"
                        className="text-[hsl(var(--brand))] hover:underline"
                      >
                        Manage inventory
                      </Link>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------- price */}
        <section className="card p-5">
          <h2 className="font-semibold">Renting it out</h2>
          <p className="mb-4 mt-1 text-sm text-[hsl(var(--ink-4))]">
            What you&apos;re advertising it for. This isn&apos;t the rent on any
            lease — a vacant place has no lease, so without this there&apos;d be
            nothing to show someone looking.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Asking rent"
              error={errors.asking_rent}
              hint="Per month"
            >
              <NumberInput
                value={form.asking_rent}
                onChange={(v) => set('asking_rent', v)}
                min="0"
                step="0.01"
                prefix="$"
                placeholder="1200"
                error={errors.asking_rent}
              />
            </Field>
            <Field label="Available from" hint="Blank means available now">
              <input
                type="date"
                value={form.available_from}
                onChange={(e) => set('available_from', e.target.value)}
                className="field"
              />
            </Field>
          </div>
        </section>

        {/* --------------------------------------------------------- photos */}
        <section className="card p-5">
          <h2 className="font-semibold">Photos</h2>
          <p className="mb-4 mt-1 text-sm text-[hsl(var(--ink-4))]">
            The first photo does most of the work. Nobody enquires about a grey
            box.
          </p>

          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium">Main photo</p>
              {primaryPreview ? (
                <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-[hsl(var(--surface-sunken))]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={primaryPreview}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPrimaryFile(null);
                      setPrimaryPreview(null);
                    }}
                    className="absolute right-2 top-2 rounded-lg bg-black/60 p-1.5 text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label
                  className="flex aspect-[16/10] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors hover:bg-[hsl(var(--surface-sunken))]"
                  style={{ borderColor: 'hsl(var(--line-strong))' }}
                >
                  <Camera className="mb-2 h-7 w-7 text-[hsl(var(--ink-5))]" />
                  <span className="text-sm font-medium">
                    Add the main photo
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setPrimaryFile(f);
                      setPrimaryPreview(URL.createObjectURL(f));
                    }}
                  />
                </label>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">More photos</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {galleryFiles.map((f, i) => (
                  <div
                    key={i}
                    className="relative aspect-square overflow-hidden rounded-lg bg-[hsl(var(--surface-sunken))]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={URL.createObjectURL(f)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setGalleryFiles((g) => g.filter((_, j) => j !== i))
                      }
                      className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <label
                  className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border-2 border-dashed transition-colors hover:bg-[hsl(var(--surface-sunken))]"
                  style={{ borderColor: 'hsl(var(--line-strong))' }}
                >
                  <ImageIcon className="h-5 w-5 text-[hsl(var(--ink-5))]" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      setGalleryFiles((g) => [...g, ...files].slice(0, 12));
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------- status + public */}
        <section className="card p-5">
          <h2 className="font-semibold">Status</h2>
          <p className="mb-4 mt-1 text-sm text-[hsl(var(--ink-4))]">
            This mostly looks after itself — activating a lease marks it
            Occupied, starting maintenance marks it Under maintenance — but
            anything you set by hand always wins.
          </p>

          <Field label="Right now it's">
            <Select<PropertyStatus>
              value={form.status}
              onChange={(v) => set('status', v)}
              options={STATUSES.map((s) => ({
                value: s.value,
                label: s.label,
              }))}
            />
          </Field>

          <div className="mt-4">
            <CheckboxRow
              checked={form.is_publicly_visible}
              onChange={(v) => set('is_publicly_visible', v)}
              label="Show this one on my public page"
              hint="Only has any effect if you've turned your public page on in Settings. Untick to keep this one property private while the rest stay listed."
            />
            {!form.is_publicly_visible && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-[hsl(var(--ink-4))]">
                <EyeOff className="h-3.5 w-3.5" />
                Hidden from your public page, whatever your other settings say.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Sticky save bar. The old form buried Save at the bottom of a 1,200-line
          page and made you scroll past everything to reach it. */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 backdrop-blur md:pl-[232px]"
        style={{ borderColor: 'hsl(var(--line))' }}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <p className="text-xs text-[hsl(var(--ink-4))]">
            {form.status === 'AVAILABLE' &&
            form.is_publicly_visible &&
            form.asking_rent &&
            address ? (
              <span className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" /> Will appear publicly (if your
                page is on)
              </span>
            ) : (
              "Won't appear publicly yet"
            )}
          </p>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-[hsl(var(--brand))] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[hsl(var(--brand-hover))] disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? 'Save changes' : 'Add property'}
          </button>
        </div>
      </div>
    </div>
  );
}
