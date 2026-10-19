export const formatTime = (date) => {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const getLoginLogoutTimes = () => {
  const logout = new Date();
  const login = new Date(logout);
  login.setHours(login.getHours() - 9);

  return { login, logout };
};
