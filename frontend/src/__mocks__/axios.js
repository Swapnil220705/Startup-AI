// frontend/src/__mocks__/axios.js
const mockAxios = {
  get: jest.fn(() => Promise.resolve({ data: { success: true, data: {} } })),
  post: jest.fn(() => Promise.resolve({ data: { success: true, data: {} } })),
  patch: jest.fn(() => Promise.resolve({ data: { success: true, data: {} } })),
  delete: jest.fn(() => Promise.resolve({ data: { success: true, data: {} } })),
  create: jest.fn(function () {
    return mockAxios;
  }),
  defaults: {
    headers: {
      common: {}
    },
    withCredentials: true
  },
  interceptors: {
    request: { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() }
  }
};

export default mockAxios;
