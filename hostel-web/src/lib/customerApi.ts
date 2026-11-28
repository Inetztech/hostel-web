// src/lib/customerApi.ts
import api from "./api";

export interface CustomerRegisterPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
}

/** Public sign-up. Always creates a CUSTOMER on the Free plan; the server never reads a role from the client. */
export const registerCustomer = async (payload: CustomerRegisterPayload): Promise<string> => {
  const res = await api.post("/auth/register-customer", payload);
  return res.data?.message ?? "Registration successful. Please sign in.";
};
