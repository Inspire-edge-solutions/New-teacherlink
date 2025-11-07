import React, { Suspense } from "react";
import LoadingState from "../../../components/common/LoadingState";
const Loadable = (Component) => (props) =>
  (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <LoadingState
            title="Loading this view…"
            subtitle="We’re fetching the latest content for you."
            layout="card"
          />
        </div>
      }
    >
      <Component {...props} />
    </Suspense>
  );

export default Loadable;
