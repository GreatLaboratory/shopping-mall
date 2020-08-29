declare namespace NodeJS {
    interface Process {
      /** running on server */
      isServer: boolean
    }
    interface ProcessEnv {
      /** node environment */
      JWT_SECRET: string,
      MONGODB_URI: string,
      TOSS_API_KEY: string,
      SENS_SERVICE_ID: string,
      SENS_ACCESS_KEY_ID: string,
      SENS_SECRET_KEY: string,
      SENS_PHONE_NUM: string,
      KAKAO_ADMIN_KEY: string,
      KAKAOPAY_CID_KEY: string,
    }
  }