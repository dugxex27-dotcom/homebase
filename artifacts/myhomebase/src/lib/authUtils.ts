export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

export function requiresRole(userRole: string | undefined, requiredRole: 'homeowner' | 'contractor'): boolean {
  return userRole === requiredRole;
}