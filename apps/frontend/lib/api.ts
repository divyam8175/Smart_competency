const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type CandidatePayload = {
  full_name: string;
  email: string;
  job_role: string;
  resume_text: string;
  portfolio_links: string[];
  notes?: string;
};

export async function createCandidate(payload: CandidatePayload) {
  try {
    console.log("Submitting to:", `${API_BASE_URL}/api/candidates`);
    console.log("Payload:", payload);
    
    const token = localStorage.getItem("token");
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}/api/candidates`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    console.log("Response status:", response.status);

    if (!response.ok) {
      const details = await response.text();
      console.error("Error response:", details);
      
      // Try to parse JSON error
      try {
        const errorJson = JSON.parse(details);
        throw new Error(errorJson.detail || errorJson.message || "Failed to create candidate");
      } catch {
        throw new Error(details || `Server error: ${response.status}`);
      }
    }

    const data = await response.json();
    console.log("Success response:", data);
    return data;
  } catch (error) {
    console.error("Network error:", error);
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error("Cannot connect to backend. Is it running on http://localhost:8000?");
    }
    throw error;
  }
}

export async function getCandidates() {
  try {
    const token = localStorage.getItem("token");
    const headers: HeadersInit = {};
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}/api/candidates`, {
      headers,
    });

    if (!response.ok) {
      const details = await response.text();
      console.error("Error response:", details);
      
      try {
        const errorJson = JSON.parse(details);
        throw new Error(errorJson.detail || errorJson.message || "Failed to fetch candidates");
      } catch {
        throw new Error(details || `Server error: ${response.status}`);
      }
    }

    return await response.json();
  } catch (error) {
    console.error("Network error:", error);
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error("Cannot connect to backend. Is it running on http://localhost:8000?");
    }
    throw error;
  }
}
