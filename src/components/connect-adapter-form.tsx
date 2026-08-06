"use client";

import { useActionState, useState } from "react";
import type { AdapterConfigActionState, AdapterConfigMapping } from "@/modules/ecommerce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type GenerateAction = (
  prev: AdapterConfigActionState,
  formData: FormData,
) => Promise<AdapterConfigActionState>;

type TestOrSaveAction = (
  prev: AdapterConfigActionState,
  formData: FormData,
) => Promise<AdapterConfigActionState>;

interface ConnectAdapterFormProps {
  generateAction: GenerateAction;
  testAction: TestOrSaveAction;
  connectAction: TestOrSaveAction;
  projectId: string;
}

function credentialFields(
  config?: AdapterConfigMapping | null,
): { key: string; label: string; type: string; placeholder?: string }[] {
  if (!config?.credentialSchema?.fields) return [];
  return config.credentialSchema.fields.map((field) => ({
    key: field.key,
    label: field.label ?? field.key,
    type: field.type === "password" ? "password" : "text",
    placeholder: field.placeholder,
  }));
}

export function ConnectAdapterForm({
  generateAction,
  testAction,
  connectAction,
  projectId,
}: ConnectAdapterFormProps) {
  const [config, setConfig] = useState<AdapterConfigMapping | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});

  const [generateState, generateFormAction, generatePending] = useActionState<
    AdapterConfigActionState,
    FormData
  >(async (prev, formData) => {
    const result = await generateAction(prev, formData);
    if (result?.ok && result.config) {
      const generatedConfig = result.config as AdapterConfigMapping;
      setConfig(generatedConfig);
      const fields = generatedConfig.credentialSchema?.fields ?? [];
      setCredentials(Object.fromEntries(fields.map((f) => [f.key, ""])));
    }
    return result;
  }, undefined);

  const [testState, testFormAction, testPending] = useActionState<
    AdapterConfigActionState,
    FormData
  >(testAction, undefined);

  const [saveState, saveFormAction, savePending] = useActionState<
    AdapterConfigActionState,
    FormData
  >(connectAction, undefined);

  const fields = credentialFields(config);

  return (
    <div className="space-y-6">
      <form action={generateFormAction} className="space-y-4">
        <input type="hidden" name="projectId" value={projectId} />
        <div className="space-y-2">
          <Label htmlFor="platformName">Platform name</Label>
          <Input
            id="platformName"
            name="platformName"
            placeholder="e.g. AcmeCommerce"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="apiDocs">API documentation</Label>
          <Textarea
            id="apiDocs"
            name="apiDocs"
            placeholder="Paste the platform's REST API docs here. The AI will generate the adapter mapping."
            rows={8}
            required
          />
        </div>
        <Button type="submit" disabled={generatePending}>
          {generatePending ? "Generating…" : "Generate adapter"}
        </Button>
        {generateState?.error && (
          <p className="text-sm text-destructive" role="alert">
            {generateState.error}
          </p>
        )}
      </form>

      {config && (
        <>
          <div className="space-y-2 rounded-md border p-4">
            <h3 className="text-sm font-medium">Generated adapter config</h3>
            <pre className="max-h-48 overflow-auto text-xs">
              {JSON.stringify(config, null, 2)}
            </pre>
          </div>

          <form action={testFormAction} className="space-y-4">
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="config" value={JSON.stringify(config)} />
            <input type="hidden" name="platformName" value={config.platformName} />
            <input type="hidden" name="credentials" value={JSON.stringify(credentials)} />
            <h3 className="text-sm font-medium">Credentials</h3>
            {fields.length > 0 ? (
              fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={`cred-${field.key}`}>{field.label}</Label>
                  <Input
                    id={`cred-${field.key}`}
                    type={field.type}
                    placeholder={field.placeholder}
                    required
                    value={credentials[field.key] ?? ""}
                    onChange={(e) =>
                      setCredentials((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                  />
                </div>
              ))
            ) : (
              <div className="space-y-2">
                <Label htmlFor="credentials">Credentials JSON</Label>
                <Textarea
                  id="credentials"
                  name="credentials"
                  placeholder='{"accessToken": "..."}'
                  rows={4}
                  required
                  value={JSON.stringify(credentials, null, 2)}
                  onChange={(e) => {
                    try {
                      setCredentials(JSON.parse(e.target.value));
                    } catch {
                      /* ignore partial JSON */
                    }
                  }}
                />
              </div>
            )}
            <Button type="submit" disabled={testPending} variant="secondary">
              {testPending ? "Testing…" : "Test connection"}
            </Button>
            {testState?.error && (
              <p className="text-sm text-destructive" role="alert">
                {testState.error}
              </p>
            )}
            {testState?.valid && (
              <p className="text-sm text-green-600">
                Connection valid{testState.storeName ? `: ${testState.storeName}` : ""}
                {testState.productCount !== undefined
                  ? ` · ${testState.productCount} products`
                  : ""}
              </p>
            )}
          </form>

          <form action={saveFormAction} className="space-y-4">
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="config" value={JSON.stringify(config)} />
            <input type="hidden" name="platformName" value={config.platformName} />
            <input type="hidden" name="credentials" value={JSON.stringify(credentials)} />
            <Button type="submit" disabled={savePending}>
              {savePending ? "Saving…" : "Save and connect"}
            </Button>
            {saveState?.error && (
              <p className="text-sm text-destructive" role="alert">
                {saveState.error}
              </p>
            )}
            {saveState?.ok && (
              <p className="text-sm text-green-600">
                Connected to {saveState.storeName ?? config.platformName}.
              </p>
            )}
          </form>
        </>
      )}
    </div>
  );
}
