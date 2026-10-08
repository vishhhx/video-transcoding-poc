import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isAuthenticated: false,
  authdata: null,
};

export const authSlice = createSlice({
  name: "auth",
  initialState: initialState,
  reducers: {
    addUserAuth: (state, action) => {
      state.isAuthenticated = true;
      state.authdata = action.payload;
    },
    removeUserAuth: (state) => {
      state.isAuthenticated = false;
      state.authdata = null;
    },
  },
});

export const authReducer = authSlice.reducer;
export const { addUserAuth, removeUserAuth } = authSlice.actions;
