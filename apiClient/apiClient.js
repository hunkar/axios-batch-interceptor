import axios from "axios";
import addInterceptor from "./interceptor.js";
import dotenv from "dotenv";

//Bring parameters from .env file to process.
dotenv.config();

const client = () => {
  const config = {
    host: process.env.HOST,
    baseAPI: process.env.BASE_API,
    headers: {},
  };
  const instance = axios.create(config);

  addInterceptor(instance, ["/file-batch-api"]);
  return instance;
};

export default client();
