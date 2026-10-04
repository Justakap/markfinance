import { LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import MainLayout from "../layout/MainLayout";
import { auth } from "../firebase";
import { clearSession } from "../utils/auth";

const SettingsPage = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const name = user?.name || "Market User";
  const email = user?.email || "No email available";
  const initial = name.charAt(0).toUpperCase();

  const handleLogout = async () => {
    await signOut(auth);
    clearSession();
    delete axios.defaults.headers.common.Authorization;
    navigate("/login");
  };

  return (
    <MainLayout
      title="Settings"
      subtitle="Manage your profile and account details"
    >
      <div className="min-h-screen bg-[#FAFBFC] p-8">
        <div className="grid xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
          <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <div className="flex flex-col items-center text-center">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={name}
                  className="w-28 h-28 rounded-full object-cover border-4 border-blue-50 shadow-sm"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-blue-600 text-white flex items-center justify-center text-4xl font-bold border-4 border-blue-50 shadow-sm">
                  {initial}
                </div>
              )}

              <h2 className="mt-5 text-2xl font-bold text-slate-900">
                {name}
              </h2>

              <p className="text-slate-500 mt-1">{email}</p>

              <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
                <ShieldCheck size={16} />
                Google account connected
              </span>

              <button
                onClick={handleLogout}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-red-50 px-5 py-3 font-semibold text-red-600 hover:bg-red-100 transition"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-900">
              Profile Information
            </h2>

            <div className="grid md:grid-cols-2 gap-4 mt-6">
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3 text-slate-500">
                  <UserRound size={18} />
                  <span className="text-sm font-medium">Full Name</span>
                </div>

                <p className="mt-3 text-lg font-semibold text-slate-900">
                  {name}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3 text-slate-500">
                  <Mail size={18} />
                  <span className="text-sm font-medium">Email Address</span>
                </div>

                <p className="mt-3 text-lg font-semibold text-slate-900 break-all">
                  {email}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-sm font-medium text-slate-500">
                  Account Type
                </p>

                <p className="mt-3 text-lg font-semibold text-slate-900">
                  Personal
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </MainLayout>
  );
};

export default SettingsPage;
