import { formatTime, getLoginLogoutTimes } from "./timeUtils";

export const generateEmail = (project, activities) => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
  const { login, logout } = getLoginLogoutTimes();

  let body = `

CODE - OATPL/MUM/24/2009
PROJECT NAME - ${project}
REPORTING TO - Vishal Nigam
START TIME - ${formatTime(login)}
LEAVING TIME - ${formatTime(logout)}

ACTIVITIES ::

`;

  activities.forEach((activity, index) => {
    body += `${index + 1}. ${activity}

`;
  });

  return body;
};
