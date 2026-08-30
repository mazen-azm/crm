import { useState } from 'react';

import {
  Button,
  Card,
  ErrorState,
  Field,
  Heading,
  Isolated,
  Stack,
  Text,
  TextArea,
} from '../../shared/ui';
import { useTranslation } from '../../shared/i18n';
import { usePublicRaiseTicket } from './usePublicRaiseTicket';

const BLANK = { name: '', email: '', subject: '', body: '' };

// The one screen in this product a stranger sees.
//
// It renders outside RequireAuth and outside DeskShell, and both are
// deliberate: there is no session, and the desk's navigation would offer a
// person four screens they cannot open. Sign-in is outside the shell for the
// same reason, and its comment says so.
export function PublicRaiseTicketPage() {
  const { t } = useTranslation();
  const raise = usePublicRaiseTicket();
  const [form, setForm] = useState(BLANK);

  const set = <K extends keyof typeof BLANK>(key: K, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const marked = (field: string) =>
    raise.status === 'error' && raise.error?.fields?.includes(field)
      ? t.errors.VALIDATION_FAILED
      : undefined;

  const busy = raise.status === 'loading';
  const failed = raise.status === 'error' ? raise.error : null;

  if (raise.status === 'success' && raise.ticket) {
    return (
      <Stack gap={4}>
        <Heading level={1}>{t.portalRaise.sentTitle}</Heading>
        <Card>
          <Stack gap={2}>
            {/* The reference IS the confirmation. A sentence saying it worked,
                with nothing to quote, leaves somebody with nothing to say when
                they telephone about it. */}
            <Text variant="muted">{t.portalRaise.reference}</Text>
            <Text>
              <Isolated>{raise.ticket.id}</Isolated>
            </Text>
            <Text variant="muted">{t.portalRaise.sentBody}</Text>
          </Stack>
        </Card>
        <Button
          variant="secondary"
          onClick={() => {
            setForm(BLANK);
            raise.reset();
          }}
        >
          {t.portalRaise.another}
        </Button>
      </Stack>
    );
  }

  return (
    <Stack gap={4}>
      <Heading level={1}>{t.portalRaise.title}</Heading>
      <Text variant="muted">{t.portalRaise.subtitle}</Text>

      {failed && !failed.fields?.length ? (
        <ErrorState
          title={t.portalRaise.failed}
          // A throttled request gets its own sentence. The shared one says
          // "Too many attempts", which is told to somebody who may have made
          // exactly one: the intake counts every arrival from an address, so a
          // first-time visitor can meet the ceiling because of somebody else
          // behind the same connection. Saying they tried too often would be
          // untrue and unactionable.
          body={
            failed.code === 'RATE_LIMITED'
              ? t.portalRaise.tooMany
              : (t.errors[failed.code as keyof typeof t.errors] ?? t.errors.INTERNAL)
          }
        />
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          const name = form.name.trim();
          raise.submit({
            email: form.email.trim(),
            // Absent when blank, not ''. Identity resolution takes the name
            // only to fill a new customer's row, and an empty string there
            // would be a name.
            ...(name ? { name } : {}),
            subject: form.subject,
            body: form.body,
          });
        }}
      >
        <Stack gap={3}>
          {/* NOT type="email". The browser refuses to submit a form whose
              type="email" input does not parse, so the API's own rule never
              runs — and the sentence somebody reads is the browser's, in the
              browser's language, unstyled, and outside the resource files
              BR-6 requires. SC-2 puts every rule in the API; this field's job
              is to carry what was typed there. A test caught this by asserting
              a 422 marks the field and finding no request had been made. */}
          <Field
            id="email"
            label={t.portalRaise.email}
            value={form.email}
            error={marked('email')}
            onChange={(event) => set('email', event.target.value)}
          />
          <Field
            id="name"
            label={t.portalRaise.name}
            value={form.name}
            error={marked('name')}
            onChange={(event) => set('name', event.target.value)}
          />
          <Field
            id="subject"
            label={t.portalRaise.subject}
            value={form.subject}
            error={marked('subject')}
            onChange={(event) => set('subject', event.target.value)}
          />
          <Field id="body" label={t.portalRaise.body} error={marked('body')}>
            {({ id, describedBy, invalid }) => (
              <TextArea
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                placeholder={t.portalRaise.bodyPlaceholder}
                value={form.body}
                onChange={(event) => set('body', event.target.value)}
              />
            )}
          </Field>

          {/* Disabled while in flight: this creates a ticket, so a second
              press is a second ticket rather than a retry. */}
          <Button type="submit" disabled={busy}>
            {busy ? t.portalRaise.submitting : t.portalRaise.submit}
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
