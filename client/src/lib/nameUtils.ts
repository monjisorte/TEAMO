/**
 * 生徒または教師のフルネームを取得する
 */
export function getFullName(
  lastName: string | null | undefined,
  firstName: string | null | undefined
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
  return "名前未設定";
}

/**
 * アバターのイニシャルを取得する
 */
export function getInitials(
  lastName: string | null | undefined,
  firstName: string | null | undefined
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
  return "?";
}
