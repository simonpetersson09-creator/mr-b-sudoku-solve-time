/** MrB. Admin hub token kept in memory only (iframe cookies/storage may be blocked). */
let token: string | null = null;
export const getHubToken = () => token;
export const setHubToken = (value: string) => { token = value; };
