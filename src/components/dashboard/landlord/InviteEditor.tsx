'use client';

/**
 * Correcting or withdrawing an invite.
 *
 * A landlord who typed the wrong email had one route: delete the whole tenant
 * slot and re-invite, losing the rent share and any history with it. And the
 * wrong recipient kept a working link either way, because nothing revoked it.
 *
 * Both halves are handled here. Editing the email REDIRECTS the invite — the
 * backend rotates the token, so the first link dies — and the dialog says so,
 * because "I fixed the address" and "the stranger can no longer open my
 * tenancy" are not obviously the same action.
 */

import React, { useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { removeLeaseTenant, updateInvite } from '@/lib/leaseApi';

export interface EditableInvite {
  id: string;
  invited_email: string;
  invited_name?: string | null;
  tenant_name?: string | null;
  /** Linked means they have an account: the name is theirs from then on, and
   *  the invite token is no longer how they get in. */
  invite_status: string;
  has_signed: boolean;
  rent_amount?: string | null;
}

export function InviteEditor({
  token,
  invite,
  onClose,
  onDone,
}: {
  token: string;
  invite: EditableInvite;
  onClose: () => void;
  onDone: () => void;
}) {
  const linked =
    invite.invite_status === 'LINKED' || Boolean(invite.tenant_name);
  const [email, setEmail] = useState(invite.invited_email ?? '');
  const [name, setName] = useState(invite.invited_name ?? '');
  const [busy, setBusy] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const emailChanged =
    email.trim().toLowerCase() !== (invite.invited_email ?? '').toLowerCase();
  const nameChanged = name.trim() !== (invite.invited_name ?? '').trim();
  const nothingToDo = !emailChanged && !nameChanged;

  const save = async () => {
    setBusy(true);
    try {
      const patch: Record<string, string> = {};
      if (emailChanged) patch.invited_email = email.trim();
      if (nameChanged && !linked) patch.invited_name = name.trim();
      await updateInvite(token, invite.id, patch);
      toast.success(
        emailChanged
          ? `Invite redirected to ${email.trim()}. The old link no longer works — send the new one when you're ready.`
          : 'Invite updated.'
      );
      onDone();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not update the invite.'
      );
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await removeLeaseTenant(token, invite.id);
      toast.success('Invite withdrawn.');
      onDone();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not withdraw the invite.'
      );
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {confirmingRemove ? 'Withdraw this invite?' : 'Edit invite'}
          </DialogTitle>
          <DialogDescription>
            {confirmingRemove
              ? `${invite.invited_name || invite.invited_email} will be removed from this lease, along with the rent share assigned to them. You'll need to reassign it.`
              : 'Fix the address it went to, or the name that prints on the agreement.'}
          </DialogDescription>
        </DialogHeader>

        {confirmingRemove ? (
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmingRemove(false)}
              disabled={busy}
            >
              Keep it
            </Button>
            <Button variant="destructive" onClick={remove} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Withdraw invite
            </Button>
          </DialogFooter>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={invite.has_signed}
                />
                {emailChanged && !invite.has_signed && (
                  <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      This redirects the invite. The link already sent to{' '}
                      <strong>{invite.invited_email}</strong> will stop working,
                      so whoever received it can no longer open or sign this
                      lease. Nothing is emailed automatically — resend once
                      you&apos;ve saved.
                    </span>
                  </p>
                )}
                {invite.has_signed && (
                  <p className="text-xs text-slate-500">
                    This person has already signed, so their email is fixed —
                    the signature is recorded against it. Withdraw the invite
                    instead if the wrong person signed.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-name">Full legal name</Label>
                <Input
                  id="invite-name"
                  value={linked ? (invite.tenant_name ?? name) : name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={linked}
                />
                <p className="text-xs text-slate-500">
                  {linked
                    ? 'They have linked their account, so their own account name is what prints on the agreement now.'
                    : 'Prints in the parties and signature blocks.'}
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button
                variant="ghost"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => setConfirmingRemove(true)}
                disabled={busy}
              >
                <Trash2 className="mr-1 h-4 w-4" /> Withdraw
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} disabled={busy}>
                  Cancel
                </Button>
                <Button onClick={save} disabled={busy || nothingToDo}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
