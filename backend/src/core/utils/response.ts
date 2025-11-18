type SuccessResponse<T> = {
  success: true;
  data: T;
};

type ErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

export const ok = <T>(data: T): SuccessResponse<T> => ({
  success: true,
  data,
});

export const error = (code: string, message: string): ErrorResponse => ({
  success: false,
  error: { code, message },
});
