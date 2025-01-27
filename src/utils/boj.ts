export const isWaitingJudge = (result: string) => {
  return (
    result.includes('채점 중') ||
    result.includes('채점 준비 중') ||
    result.includes('기다리는 중')
  );
};

export const isNonBlank = (obj: any) => {
  return Object.values(obj).every(
    (value) => value !== undefined && value !== null,
  );
};

export function isSubmissionPage(): boolean {
  return /\/submit\/\d+/.test(window.location.href);
}

export function isStatusPage(): boolean {
  return /\/status/.test(window.location.href);
}
