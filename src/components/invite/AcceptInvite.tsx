// AcceptInvite.tsx
"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, AlertCircle, FileText, CheckCircle2 } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { DJANGO_API_URL } from "@/lib/config"
import { toast } from "sonner"

interface InvitePreview {
  lease_number: string
  lease_type: string
  property_address: string | null
  group_name: string | null
  rent_amount: string
  already_signed: boolean
}

export default function AcceptInvite({ leaseTenantId, token }: { leaseTenantId: string; token: string }) {
  const router = useRouter()
  // NOTE: verify this against your actual AuthContext — this component
  // assumes a `login(authToken, user)` function exists that stores the
  // token/user the same way your normal sign-in flow does, so the person
  // lands on their dashboard already authenticated. If your AuthContext
  // exposes something else (e.g. a `setSession()` or just `setToken()` +
  // `setUser()` pair), swap the single call in handleSubmit accordingly —
  // everything else in this component is independent of that detail.
  const { login } = useAuth() as { login?: (authToken: string, user: unknown) => void }

  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(true)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    const loadPreview = async () => {
      setIsLoadingPreview(true)
      setPreviewError(null)
      try {
        const res = await fetch(
          `${DJANGO_API_URL}/leases/tenants/${leaseTenantId}/invite-preview/?token=${encodeURIComponent(token)}`
        )
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.detail || "This invite link is invalid or has expired.")
        }
        const data = await res.json()
        setPreview({
          lease_number: data.lease_number,
          lease_type: data.lease_type,
          property_address: data.property_address,
          group_name: data.group_name,
          rent_amount: data.rent_amount,
          already_signed: data.already_signed,
        })
      } catch (err) {
        setPreviewError(err instanceof Error ? err.message : "Could not load this invite.")
      } finally {
        setIsLoadingPreview(false)
      }
    }
    loadPreview()
  }, [leaseTenantId, token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.")
      return
    }
    if (password !== confirmPassword) {
      setFormError("Passwords don't match.")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(
        `${DJANGO_API_URL}/leases/tenants/${leaseTenantId}/activate-account/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password, name }),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const message =
          data.detail ||
          data.password?.join(" ") ||
          "Couldn't create your account. The link may have already been used.";
        throw new Error(message)
      }

      if (login) {
        login(data.token, data.user)
      } else {
        // Fallback if no login() is available on this AuthContext — at
        // minimum get them to the login page with a clear next step rather
        // than silently stranding them after a successful account creation.
        toast.success("Account created! Please log in.")
        router.push("/auth/login")
        return
      }

      toast.success("Account created — welcome!")
      router.push("/dashboard")
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingPreview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  if (previewError || !preview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
            <p className="text-destructive font-medium">{previewError || "Invite not found."}</p>
            <p className="text-sm text-slate-500 mt-2">
              Ask your landlord to resend the invite if you think this is a mistake.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (preview.already_signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto mb-2" />
            <CardTitle>Already signed</CardTitle>
            <CardDescription>
              This lease has already been signed. If you don't have an account yet, ask your
              landlord for a fresh invite link, or try logging in if you've already set a password.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push("/auth/login")}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 p-3 rounded-full bg-blue-100 w-fit">
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle>You've been invited to a lease</CardTitle>
          <CardDescription>
            Set a password to create your account, then you'll be able to review and sign.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-slate-50 rounded-md p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Property</span>
              <span className="font-medium">{preview.property_address || preview.group_name || preview.lease_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Lease Number</span>
              <span className="font-medium">{preview.lease_number}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-md">
                {formError}
              </div>
            )}

            <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Create Account & Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}