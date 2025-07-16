import React, { Suspense } from "react";
import { render } from "react-dom";

import { Application } from "./Application";
import { CircularProgress } from "@mui/material";

import "./index.scss";

try {
  const rootElement = (
    <Suspense fallback={<CircularProgress />}>
      <Application />
    </Suspense>
  );
  render(rootElement, document.getElementById("application"));
} catch (error) {
  console.error(error);
}
