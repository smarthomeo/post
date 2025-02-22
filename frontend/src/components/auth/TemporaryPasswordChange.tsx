import { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AuthContext } from "@/contexts/AuthContext";

interface FormValues {
  temporaryPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const validationSchema = Yup.object().shape({
  temporaryPassword: Yup.string()
    .required("Temporary password is required"),
  newPassword: Yup.string()
    .required("New password is required")
    .min(6, "Password must be at least 6 characters"),
  confirmPassword: Yup.string()
    .required("Please confirm your password")
    .oneOf([Yup.ref("newPassword")], "Passwords must match"),
});

const TemporaryPasswordChange = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext) || {};

  useEffect(() => {
    // If user is not using a temporary password, redirect to dashboard
    if (!user?.isTemporaryPassword) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const initialValues: FormValues = {
    temporaryPassword: "",
    newPassword: "",
    confirmPassword: "",
  };

  const handleSubmit = async (values: FormValues) => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/auth/change-temporary-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          temporaryPassword: values.temporaryPassword,
          newPassword: values.newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to change password");
      }

      toast({
        title: "Success",
        description: "Password changed successfully",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to change password",
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Change Temporary Password</h2>
          <p className="text-primary/80 mt-2">
            Please change your temporary password to continue
          </p>
        </div>

        <div className="bg-white/80 rounded-lg shadow-xl p-6">
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ errors, touched, values, handleChange, handleBlur }) => (
              <Form className="space-y-6">
                <div>
                  <label htmlFor="temporaryPassword" className="block text-sm font-medium text-primary/90">
                    Temporary Password
                  </label>
                  <Input
                    id="temporaryPassword"
                    name="temporaryPassword"
                    type="password"
                    value={values.temporaryPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="mt-1"
                  />
                  {errors.temporaryPassword && touched.temporaryPassword && (
                    <p className="mt-1 text-sm text-red-500">{errors.temporaryPassword}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-primary/90">
                    New Password
                  </label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={values.newPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="mt-1"
                  />
                  {errors.newPassword && touched.newPassword && (
                    <p className="mt-1 text-sm text-red-500">{errors.newPassword}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-primary/90">
                    Confirm New Password
                  </label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={values.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="mt-1"
                  />
                  {errors.confirmPassword && touched.confirmPassword && (
                    <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>
                  )}
                </div>

                <Button type="submit" className="w-full">
                  Change Password
                </Button>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </div>
  );
};

export default TemporaryPasswordChange; 