/**
 * The CV and the profile one call names, read, and checked when a command needs them whole.
 *
 * checked: the checked CV of a call, with its profile applied when the call names one.
 * profileOf: the unchecked value of a named profile.
 * cvOf, profileCv: the CV a profile names, and the CV the profile of a call names.
 *
 * @example const cv = await checked(call);
 */
import { done } from '../core/errors.ts';
import { check } from '../core/check.ts';
import { Profile } from '../core/cv.schema.ts';
import { readJson } from '../core/files.ts';
import { chosenCv, profilePath } from '../core/home.ts';
import type { Call } from './types.ts';

// The CV the profile of this call names, so a list follows the CV the command itself would use.
export async function profileCv(call: Call) {
  if (call.values.profile === undefined) return undefined;
  const profile = await profileOf(call.home, call.values.profile);
  return cvOf(profile.data);
}

// The checked CV of this call, with the profile applied when the call names one.
export async function checked(call: Call, profileName = call.values.profile) {
  const profile =
    profileName === undefined ? done(undefined) : await profileOf(call.home, profileName);
  if (profile.error !== null) return profile;
  const cv = await chosenCv(call.home, call.values.cv, cvOf(profile.data));
  if (cv.error !== null) return cv;
  const master = await readJson(cv.data.path, 'cv');
  if (master.error !== null) return master;
  return check(master.data, profile.data);
}

export async function profileOf(home: string, name: string) {
  const path = await profilePath(home, name);
  if (path.error !== null) return path;
  return readJson(path.data, 'profile');
}

// The CV a profile names; check() reports a profile that fails its schema, so this one only reads.
export const cvOf = (profile: unknown) => {
  const parsed = Profile.safeParse(profile);
  return parsed.success ? parsed.data.cv : undefined;
};
