export const getUser = (key) => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  };
   export const getUserProp = (key, prop) => {
    const user = getUser(key);
    return user ? user[prop] : null;
  }; 
  export const clearUser = (key) => {
    localStorage.removeItem(key);
  };