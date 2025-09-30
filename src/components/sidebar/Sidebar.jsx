import React, { useState } from "react";
import { getUserProp } from "../../Context/UserSession";
import { NavLink, useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  User,
  UserCircle,
  Briefcase,
  FileText, 
  MessageSquare,
  Bell,
  Star,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import teacherlinkLogo from "../../assets/teacherlink-logo.png";

export default function Sidebar({
  isCollapsed,
  setIsCollapsed,
  className = "",
}) {
  const [openItems, setOpenItems] = useState({});
  const location = useLocation();
  const userType = getUserProp("user", "user_type");

  const toggleItem = (item) => {
    setOpenItems((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };


  const providerMenu = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/provider/dashboard" },
    { label: "My Account", icon: User, path: "/provider/my-account" },
    { label: "My Profile", icon: UserCircle, path: "/provider/my-profile" },
    { label: "My Jobs", icon: Briefcase, path: "/provider/post-jobs" },
    { label: "All Candidates", icon: FileText, path: "/provider/all-candidates" },
    { label: "Messages", icon: MessageSquare, path: "/provider/messages" },
    { label: "Notifications", icon: Bell, path: "/provider/notifications" },
    { label: "Premium Service", icon: Star, path: "/provider/premium-services" },
  ];

  const seekerMenu = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/seeker/dashboard" },
    { label: "My Account", icon: User, path: "/seeker/my-account" },
    { label: "My Profile", icon: UserCircle, path: "/seeker/my-profile" },
    { label: "Jobs", icon: Briefcase, path: "/seeker/all-jobs" },
    { label: "Recruiter Actions", icon: FileText, path: "/seeker/recruiter-actions",},
    { label: "Messages", icon: MessageSquare, path: "/seeker/messages" },
    { label: "Notifications", icon: Bell, path: "/seeker/notifications" },
  ];

  const menuItems = userType === "Employer" ? providerMenu : seekerMenu;

  const isItemActive = (path) => {
    if (!path) return false;
    const pathname = location.pathname;
    // exact match OR startsWith (so /jobs and /jobs/123 both match)
    if (path === "/") return pathname === "/";
    return (
      pathname === path ||
      pathname.startsWith(path + "/") ||
      pathname.startsWith(path)
    );
  };

  return (
    <div
      className={`flex flex-col h-screen bg-white border-r transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-20" : "w-80"
      } ${className}`}
    >
      {/* Top header */}
      <div className="p-4 flex items-center justify-between">
        <div className={`w-8 h-8 ${isCollapsed ? "mx-auto" : ""}`}></div>
        {!isCollapsed && (
         <Link to="/home">
          <img src={teacherlinkLogo} alt="TeacherLink" className="w-30 h-10" />
         </Link>
        )}
        <button
          onClick={toggleCollapse}
          className="p-2 rounded-md hover:bg-gray-100 transition-colors duration-200"
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto">
        <ul className="py-3">
          {menuItems.map((item) => {
            const active = isItemActive(item.path);

            return (
              <li key={item.path} className="px-2">
                <NavLink
                  to={item.path || "#"}
                  // keep NavLink for navigation, but compute active manually for styling
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                    isCollapsed ? "justify-center" : ""
                  } ${
                    active
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                  onClick={() => item.submenu && toggleItem(item.label)}
                  title={isCollapsed ? item.label : undefined} // tooltip when collapsed
                >
                  <item.icon className="h-5 w-10 shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
