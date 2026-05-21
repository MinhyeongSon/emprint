/** True when emprint-qa (or tests) should bypass real OAuth / GitHub API. */
export function isQaMockAuthEnabled(): boolean {
  return process.env.EMPRINT_QA_MOCK_AUTH === '1'
}
