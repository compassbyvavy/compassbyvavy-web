"use client";

import { useEffect, useState } from "react";
import { listingCopy } from "@/lib/camps/listingForm/copy";
import type { BuiltForm, FormField } from "@/lib/camps/listingForm/types";
import { submitListing } from "@/app/camps/confirm/[token]/actions";

type Draft = Record<string, { value: string; confirmed: boolean }>;

function seed(form: BuiltForm): Draft {
  const draft: Draft = {};
  for (const field of [...form.blocks.flatMap((block) => block.fields), ...form.ask]) {
    draft[field.key] = { value: field.prefilled ?? "", confirmed: false };
  }
  for (const question of form.questions) draft[question.fieldKey] = { value: "", confirmed: false };
  draft.other_camps = { value: "", confirmed: false };
  return draft;
}

export function ConfirmForm(props: {
  token: string;
  form: BuiltForm;
  turnstileSiteKey: string | null;
  testMode: boolean;
}) {
  const storageKey = `compass-listing-${props.token}`;
  const [draft, setDraft] = useState<Draft>(() => seed(props.form));
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      setDraft({ ...seed(props.form), ...(JSON.parse(saved) as Draft) });
    } catch {
      /* keep the server values */
    }
  }, [storageKey, props.form]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(draft));
  }, [storageKey, draft]);

  function setField(key: string, patch: Partial<Draft[string]>) {
    setDraft((current) => ({ ...current, [key]: { ...current[key], value: current[key]?.value ?? "", confirmed: false, ...patch } }));
  }

  function fieldBlock(field: FormField) {
    const row = draft[field.key] ?? { value: "", confirmed: false };
    if (field.mode === "fill") {
      return (
        <label key={field.key}>
          <div className="lbl">{field.label}</div>
          <div className="tag">{listingCopy.fillIn}</div>
          {field.help ? <div className="help">{field.help}</div> : null}
          <textarea
            name={`answer__${field.key}`}
            maxLength={field.maxLength}
            value={row.value}
            onChange={(event) => setField(field.key, { value: event.target.value })}
          />
        </label>
      );
    }
    const open = editing[field.key];
    return (
      <div className="field" key={field.key}>
        <div className="lbl">{field.label}</div>
        {field.lastYear ? <div className="tag">{listingCopy.lastYear}</div> : null}
        {open ? (
          <textarea name={`answer__${field.key}`} value={row.value} onChange={(event) => setField(field.key, { value: event.target.value })} />
        ) : (
          <div className="value">{row.value}</div>
        )}
        <input type="hidden" name={`answer__${field.key}`} value={row.value} disabled={open} />
        <input type="hidden" name={`confirmed__${field.key}`} value={row.confirmed ? "yes" : ""} />
        <div className="row">
          <button
            type="button"
            className={row.confirmed ? "on" : ""}
            onClick={() => {
              setEditing((current) => ({ ...current, [field.key]: false }));
              setField(field.key, { value: field.prefilled ?? "", confirmed: true });
            }}
          >
            {listingCopy.correct}
          </button>
          <button type="button" onClick={() => setEditing((current) => ({ ...current, [field.key]: true }))}>
            {listingCopy.edit}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      action={async (formData) => {
        setPending(true);
        setMessage(null);
        const result = await submitListing(formData);
        setPending(false);
        setMessage(result.ok ? result.message : result.error);
      }}
    >
      <input type="hidden" name="token" value={props.token} />
      <section>
        <h2>{listingCopy.you}</h2>
        <label>
          <div className="lbl">{listingCopy.yourName}*</div>
          <input name="contact_name" type="text" required />
        </label>
        <label>
          <div className="lbl">{listingCopy.role}*</div>
          <input name="contact_role" type="text" required />
        </label>
        <label>
          <div className="lbl">{listingCopy.email}*</div>
          <div className="help">{listingCopy.privateNote}</div>
          <input name="contact_email" type="email" required />
        </label>
        <label>
          <div className="lbl">{listingCopy.phone}</div>
          <input name="contact_phone" type="tel" />
        </label>
        <label>
          <div className="lbl">{listingCopy.publicPhone}</div>
          <div className="help">{listingCopy.publicNote}</div>
          <input name="public_phone" type="tel" />
        </label>
        <label>
          <div className="lbl">{listingCopy.publicEmail}</div>
          <input name="public_email" type="email" />
        </label>
      </section>

      <h2>{listingCopy.check}</h2>
      {props.form.blocks.map((block) => (
        <section key={block.id}>
          <h2>{block.title}</h2>
          {block.fields.map(fieldBlock)}
        </section>
      ))}

      {props.form.questions.length ? (
        <section>
          <h2>{listingCopy.questions}</h2>
          {props.form.questions.map((question) => (
            <label key={question.id}>
              <div className="lbl">{question.prompt}</div>
              <textarea
                name={`answer__${question.fieldKey}`}
                value={draft[question.fieldKey]?.value ?? ""}
                onChange={(event) => setField(question.fieldKey, { value: event.target.value })}
              />
            </label>
          ))}
        </section>
      ) : null}

      <section>
        <h2>{listingCopy.ask}</h2>
        {props.form.ask.map(fieldBlock)}
      </section>

      <section>
        <h2>{listingCopy.other}</h2>
        <p className="help">{listingCopy.otherHelp}</p>
        <textarea
          name="answer__other_camps"
          value={draft.other_camps?.value ?? ""}
          onChange={(event) => setField("other_camps", { value: event.target.value })}
        />
      </section>

      <section>
        <h2>{listingCopy.photos}</h2>
        <p className="help">{listingCopy.photosHelp}</p>
        <label>
          <div className="lbl">Photos</div>
          <input name="photos" type="file" accept="image/jpeg,image/png,image/heic,image/webp" multiple />
        </label>
        <label>
          <div className="lbl">Logo</div>
          <input name="logo" type="file" accept="image/jpeg,image/png,image/heic,image/webp" />
        </label>
        <label>
          <div className="lbl">{listingCopy.caption}</div>
          <input name="photo_caption" type="text" />
        </label>
        <label>
          <div className="lbl">{listingCopy.credit}</div>
          <input name="photo_credit" type="text" />
        </label>
        <label className="check">
          <input name="photo_rights" type="checkbox" value="yes" required />
          <span>{listingCopy.photoRights}</span>
        </label>
        <label className="check">
          <input name="child_permission" type="checkbox" value="yes" required />
          <span>{listingCopy.childPermission}</span>
        </label>
      </section>

      <section>
        <h2>{listingCopy.confirm}</h2>
        <label className="check">
          <input name="accuracy" type="checkbox" value="yes" required />
          <span>{listingCopy.accuracy}</span>
        </label>
        <label>
          <div className="lbl">{listingCopy.typedName}*</div>
          <input name="typed_name" type="text" required />
        </label>
        {props.turnstileSiteKey ? <div className="cf-turnstile" data-sitekey={props.turnstileSiteKey} /> : null}
        {props.testMode ? <p className="help">{listingCopy.turnstileTest}</p> : null}
        {props.testMode ? <input type="hidden" name="turnstile" value="local-preview" /> : null}
        <button className="pri" type="submit" disabled={pending}>
          {listingCopy.send}
        </button>
        {message ? <p className={message.startsWith("Thanks") ? "ok" : "error"}>{message}</p> : null}
        <p className="help">{listingCopy.saved}</p>
      </section>
    </form>
  );
}
