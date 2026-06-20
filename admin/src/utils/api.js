import axios from "axios";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    Authorization: token ? `Bearer ${token}` : "",
    "Content-Type": "application/json",
  };
};

const params = {
  get headers() {
    return getAuthHeaders();
  },
};
// process.env.REACT_APP_BASE_URL +
export const fetchDataFromApi = async (url) => {
  try {
    const { data } = await axios.get("http://localhost:8000" + url, params);
    return data;
  } catch (error) {
    console.log(error);
    return error;
  }
};

export const uploadImage = async (url, formData) => {
  const { data } = await axios.post("http://localhost:8000" + url, formData);
  return data;
};

export const postData = async (url, formData) => {
  try {
    const response = await fetch("http://localhost:8000" + url, {
      method: "POST",
      headers: getAuthHeaders(),

      body: JSON.stringify(formData),
    });

    if (response.ok) {
      const data = await response.json();
      //console.log(data)
      return data;
    } else {
      const errorData = await response.json();
      return errorData;
    }
  } catch (error) {
    console.error("Error:", error);
  }
};

export const editData = async (url, updatedData) => {
  const { data } = await axios.put(
    `${"http://localhost:8000"}${url}`,
    updatedData
  );
  return data;
};

export const deleteData = async (url) => {
  const { data } = await axios.delete(
    `${"http://localhost:8000"}${url}`,
    params
  );
  return data;
};

export const deleteImages = async (url) => {
  const { data } = await axios.delete(`${"http://localhost:8000"}${url}`, params);
  return data;
};
