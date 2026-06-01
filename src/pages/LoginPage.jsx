import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../config/api";
import { setupAxiosAuth } from "../utils/api";
import { showError } from "../utils/toast";

const LoginPage = () => {
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);

      const user = result.user;

      const response = await fetch(`${API_URL}/api/auth/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
        }),
      });

      const data = await response.json();

      console.log("Mongo User:", data);

      if (!response.ok) {
        showError(data.message || "Google Login Failed");
        return;
      }

      if (!data.user) {
        showError("Failed to create user in database");
        return;
      }

      // store token if returned
      if (data.token) {
        localStorage.setItem("token", data.token);
        setupAxiosAuth();
      }

      localStorage.setItem(
        "user",
        JSON.stringify({
          uid: user.uid,
          mongoId: String(data.user._id),
          name: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
        }),
      );

      navigate("/dashboard");
    } catch (error) {
      console.error("Google Login Error:", {
        code: error?.code,
        message: error?.message,
        customData: error?.customData,
      });

      showError(
        error?.code
          ? `${error.code}: ${error.message}`
          : error?.message || "Google Login Failed",
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-200 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-600">Mark Finance</h1>

          <h2 className="text-2xl font-bold mt-6">Welcome Back</h2>

          <p className="text-gray-500 mt-2">
            Continue your investment journey.
          </p>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium"
        >
          Continue with Google
        </button>

        <div className="mt-8 text-center text-sm text-gray-500">
          Secure Login • Cloud Sync • Watchlists
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
