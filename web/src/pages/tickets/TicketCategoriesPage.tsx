import { useState } from 'react';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Heading,
  Input,
  Skeleton,
  Stack,
  Text,
} from '../../shared/ui';
import { useTranslation } from '../../shared/i18n';
import { useMe } from '../../shared/session/use-me';
import { useTicketCategories } from './useTicketCategories';
import { useAddCategory, useRenameCategory, useRetireCategory } from './useManageCategories';
import type { TicketCategory } from './useTicketCategories';

// The categories a ticket can be filed under, managed by an admin.
//
// The list is held here and edited in place: every write answers with what it
// made or retired, so the screen changes the row it just changed rather than
// asking for the list again. A reload after each write would also lose the
// half-typed rename in the row beside it.
export function TicketCategoriesPage() {
  const { t } = useTranslation();
  const { isAdmin } = useMe();
  const list = useTicketCategories();
  const adding = useAddCategory();
  const renaming = useRenameCategory();
  const retiring = useRetireCategory();

  const [name, setName] = useState('');
  const [blank, setBlank] = useState(false);
  // The list as this screen has changed it. Null until it has changed
  // anything, so the hook's own answer is what shows until then.
  const [held, setHeld] = useState<TicketCategory[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  // Which row is being renamed or retired, so a failure marks that row and not
  // the whole screen — and so two rows cannot both claim the same message.
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const categories = held ?? list.categories;
  const change = (next: TicketCategory[]) => setHeld(next);

  // Courtesy, not enforcement. The API refuses a non-admin whatever this
  // draws (SC-2) — and it is drawn from `isAdmin`, which is undefined until
  // /me answers, so nothing flashes into view and back out.
  if (isAdmin === false) {
    return <EmptyState title={t.ticketCategories.adminOnlyTitle} body={t.ticketCategories.adminOnlyBody} />;
  }

  const nameTaken = (state: { error: { code?: string; fields?: string[] } | null }) =>
    state.error?.fields?.includes('name') === true;

  return (
    <Stack as="section" gap={4}>
      <Heading level={2}>{t.ticketCategories.title}</Heading>

      <Card>
        <Stack gap={2}>
          <Field
            id="new-category"
            label={t.ticketCategories.addLabel}
            error={
              blank
                ? t.ticketCategories.nameRequired
                : nameTaken(adding)
                  ? t.errors.VALIDATION_FAILED
                  : undefined
            }
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                value={name}
                onChange={(event) => {
                  setBlank(false);
                  setName(event.target.value);
                }}
              />
            )}
          </Field>
          <Button
            disabled={adding.status === 'loading'}
            onClick={() => {
              const trimmed = name.trim();
              if (trimmed === '') {
                setBlank(true);
                return;
              }
              adding
                .add(trimmed)
                .then((made) => {
                  // Appended rather than re-fetched: the answer is the row.
                  change([...categories, made]);
                  setName('');
                })
                .catch(() => {});
            }}
          >
            {adding.status === 'loading' ? t.ticketCategories.adding : t.ticketCategories.add}
          </Button>

          {adding.status === 'error' && adding.error && !nameTaken(adding) ? (
            <ErrorState
              title={t.ticketCategories.addFailedTitle}
              body={t.errors[adding.error.code as keyof typeof t.errors] ?? t.errors.INTERNAL}
            />
          ) : null}
        </Stack>
      </Card>

      {list.status === 'loading' ? <Skeleton lines={3} height="40px" label={t.states.loading} /> : null}

      {list.status === 'error' && list.error ? (
        <ErrorState
          title={t.ticketCategories.listErrorTitle}
          body={t.errors[list.error.code as keyof typeof t.errors] ?? t.errors.INTERNAL}
          onRetry={list.reload}
          retryLabel={t.states.retry}
        />
      ) : null}

      {list.status === 'success' && categories.length === 0 ? (
        <EmptyState title={t.ticketCategories.emptyTitle} body={t.ticketCategories.emptyBody} />
      ) : null}

      <Stack gap={3}>
        {categories.map((category) => {
          const draft = drafts[category.id] ?? category.name;
          const mine = renamingId === category.id;
          return (
            <Card key={category.id}>
              <Stack gap={2}>
                <Stack direction="row" gap={2} align="start">
                  <Field
                    id={`category-${category.id}`}
                    label={t.ticketCategories.nameLabel}
                    error={mine && nameTaken(renaming) ? t.errors.VALIDATION_FAILED : undefined}
                  >
                    {({ id, describedBy, invalid }) => (
                      <Input
                        id={id}
                        aria-describedby={describedBy}
                        aria-invalid={invalid}
                        value={draft}
                        onChange={(event) =>
                          setDrafts((all) => ({ ...all, [category.id]: event.target.value }))
                        }
                      />
                    )}
                  </Field>
                  <Button
                    variant="secondary"
                    disabled={renaming.status === 'loading' || draft.trim() === category.name}
                    onClick={() => {
                      setRenamingId(category.id);
                      renaming
                        .rename(category.id, draft.trim())
                        .then((renamed) => {
                          change(categories.map((c) => (c.id === renamed.id ? renamed : c)));
                          setDrafts((all) => ({ ...all, [category.id]: renamed.name }));
                        })
                        .catch(() => {});
                    }}
                  >
                    {t.ticketCategories.rename}
                  </Button>
                </Stack>

                {mine && renaming.status === 'error' && renaming.error && !nameTaken(renaming) ? (
                  <ErrorState
                    title={t.ticketCategories.renameFailedTitle}
                    body={t.errors[renaming.error.code as keyof typeof t.errors] ?? t.errors.INTERNAL}
                  />
                ) : null}

                {confirming === category.id ? (
                  // It asks first. Retiring is the one action here that changes
                  // what everybody else's picker offers, and this screen cannot
                  // undo it — the API keeps the row for the tickets that carry
                  // it, but nothing here brings it back.
                  <Stack gap={2}>
                    <Text>{t.ticketCategories.retireConfirm}</Text>
                    <Stack direction="row" gap={2} align="start">
                      <Button
                        disabled={retiring.status === 'loading'}
                        onClick={() => {
                          retiring
                            .retire(category.id)
                            .then(() => {
                              change(categories.filter((c) => c.id !== category.id));
                              setConfirming(null);
                            })
                            .catch(() => {});
                        }}
                      >
                        {retiring.status === 'loading'
                          ? t.ticketCategories.retiring
                          : t.ticketCategories.retireConfirmYes}
                      </Button>
                      <Button variant="secondary" onClick={() => setConfirming(null)}>
                        {t.ticketCategories.retireCancel}
                      </Button>
                    </Stack>
                  </Stack>
                ) : (
                  <Button variant="secondary" onClick={() => setConfirming(category.id)}>
                    {t.ticketCategories.retire}
                  </Button>
                )}

                {confirming === category.id && retiring.status === 'error' && retiring.error ? (
                  <ErrorState
                    title={t.ticketCategories.retireFailedTitle}
                    body={t.errors[retiring.error.code as keyof typeof t.errors] ?? t.errors.INTERNAL}
                  />
                ) : null}
              </Stack>
            </Card>
          );
        })}
      </Stack>
    </Stack>
  );
}
