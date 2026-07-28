import { query } from '../db/client.js';
import { normalizeUsername, validateUsername } from '../utils/usernames.js';

export function mapAppUser(row) {
  if (!row) return null;

  return {
    id: row.supabase_user_id,
    appUserId: row.id,
    email: row.email,
    username: row.username,
    usernameNormalized: row.username_normalized,
    profilePhotoUrl: row.profile_photo_url,
    preferences: row.preferences,
    questionnaireCompleted: row.questionnaire_completed,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : null,
  };
}

export async function findOrCreateAppUser({ supabaseUserId, email }) {
  const result = await query(
    `
      insert into app_users (supabase_user_id, email)
      values ($1, $2)
      on conflict (supabase_user_id) do update set
        email = excluded.email,
        updated_at = now()
      returning *
    `,
    [supabaseUserId, email || '']
  );

  return mapAppUser(result?.rows?.[0]);
}

export async function createSignupAppUser({ supabaseUserId, email, username }) {
  const validatedUsername = validateUsername(username);

  const result = await query(
    `
      insert into app_users (supabase_user_id, email, username, username_normalized)
      values ($1, $2, $3, $4)
      on conflict (supabase_user_id) do update set
        email = excluded.email,
        username = case
          when app_users.username is null then excluded.username
          else app_users.username
        end,
        username_normalized = case
          when app_users.username_normalized is null then excluded.username_normalized
          else app_users.username_normalized
        end,
        updated_at = now()
      returning *
    `,
    [
      supabaseUserId,
      email || '',
      validatedUsername?.username || null,
      validatedUsername?.usernameNormalized || null,
    ]
  );

  return mapAppUser(result?.rows?.[0]);
}

export async function findAppUserByUsername(username) {
  const usernameNormalized = normalizeUsername(username);

  if (!usernameNormalized) {
    return null;
  }

  const result = await query(
    'select * from app_users where username_normalized = $1 limit 1',
    [usernameNormalized]
  );

  return mapAppUser(result?.rows?.[0]);
}

export async function updateAppUser(appUserId, updates) {
  const hasUsername = Object.prototype.hasOwnProperty.call(updates, 'username');
  const validatedUsername = hasUsername ? validateUsername(updates.username) : null;
  const hasProfilePhoto = Object.prototype.hasOwnProperty.call(updates, 'profilePhotoUrl');
  const hasPreferences = Object.prototype.hasOwnProperty.call(updates, 'preferences');
  const hasQuestionnaireCompleted = Object.prototype.hasOwnProperty.call(updates, 'questionnaireCompleted');

  const result = await query(
    `
      update app_users set
        username = case when $2 then $3 else username end,
        username_normalized = case when $2 then $4 else username_normalized end,
        profile_photo_url = case when $5 then $6 else profile_photo_url end,
        preferences = case when $7 then $8::jsonb else preferences end,
        questionnaire_completed = case when $9 then $10 else questionnaire_completed end,
        updated_at = now()
      where id = $1
      returning *
    `,
    [
      appUserId,
      hasUsername,
      validatedUsername?.username || null,
      validatedUsername?.usernameNormalized || null,
      hasProfilePhoto,
      hasProfilePhoto ? updates.profilePhotoUrl || null : null,
      hasPreferences,
      hasPreferences ? JSON.stringify(updates.preferences) : null,
      hasQuestionnaireCompleted,
      hasQuestionnaireCompleted ? Boolean(updates.questionnaireCompleted) : null,
    ]
  );

  return mapAppUser(result?.rows?.[0]);
}
