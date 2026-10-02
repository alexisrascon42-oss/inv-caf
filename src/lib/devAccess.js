const DEV_EMAIL = 'alexis_891@outlook.com';

export function isDevUser(user) {
  return user?.email?.trim().toLowerCase() === DEV_EMAIL;
}