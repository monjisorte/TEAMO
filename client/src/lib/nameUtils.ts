/**
 * 生徒または教師のフルネームを取得する
 */
export function getFullName(
  lastName: string | null | undefined,
  firstName: string | null | undefined,
  fallbackName?: string | null
): string {
  if (lastName && firstName) {
    return `${lastName} ${firstName}`;
  }
  if (lastName) {
    return lastName;
  }
  if (firstName) {
    return firstName;
  }
  if (fallbackName) {
    return fallbackName;
  }
  return "名前未設定";
}

/**
 * アバターのイニシャルを取得する
 */
export function getInitials(
  lastName: string | null | undefined,
  firstName: string | null | undefined,
  fallbackName?: string | null
): string {
  if (lastName && firstName) {
    return `${lastName.charAt(0)}${firstName.charAt(0)}`;
  }
  if (lastName) {
    return lastName.charAt(0);
  }
  if (firstName) {
    return firstName.charAt(0);
  }
  if (fallbackName && fallbackName.length > 0) {
    return fallbackName.substring(0, 2);
  }
  return "?";
}
