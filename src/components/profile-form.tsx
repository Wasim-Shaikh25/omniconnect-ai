"use client";

import { useActionState } from "react";
import type { ProfileActionState } from "@/modules/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Action = (
  prev: ProfileActionState,
  formData: FormData,
) => Promise<ProfileActionState>;

interface ProfileFormProps {
  action: Action;
  defaultName: string;
  defaultImage: string;
}

export function ProfileForm({
  action,
  defaultName,
  defaultImage,
}: ProfileFormProps) {
  const [state, formAction, pending] = useActionState<
    ProfileActionState,
    FormData
  >(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={defaultName} placeholder="Your name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="image">Avatar URL (optional)</Label>
        <Input
          id="image"
          name="image"
          defaultValue={defaultImage}
          placeholder="https://…"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      {state?.ok && <p className="text-sm text-green-600">Profile saved.</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
