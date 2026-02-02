// TEMPORARY: SVG experiment (no foreignObject) for Safari compatibility testing

import { createCell } from "../canvas/jointframework/createCell";
import { CalloutHelper } from "../canvas/jointframework/helpers/CalloutHelper";
import { JointBlock } from "../canvas/jointframework/models/JointBlock";
import { Sizing } from "../canvas/jointframework/sizing/Sizing";
import { Spinner } from "../comps/Spinner";

export function svgExperimentPage() {
  /**
   * @see createCell.tsx
   */
  const spinner = (
    <div className="h-full flex justify-center items-center border-transparent" style={{ borderWidth: Sizing.BLOCK_STROKE_WIDTH }}>
      <Spinner className="border-c-info! border-t-c-info/0!" />
    </div>
  );

  /**
   * @see createCell.tsx
   * @see CalloutHelper.tsx
   */
  const calloutData: Pick<RequireNoNulls<JointBlock>, "theme" | "label" | "details"> = {
    theme: "default",
    label: "MariaDB Backup",
    details: {
      "Connection reference": "MY_MARIADB_URL",
      "Toolkit resolution": "automatic",
      "Database selection method": "all",
    },
  };

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ marginBottom: 16 }}>SVG Experiment (no foreignObject)</h1>
      <svg width="800" height="600" style={{ border: "1px solid #ccc", background: "#fafafa" }}>
        {/* Example: A node-like box with text using native SVG */}
        <g transform="translate(50, 50)">
          <rect width="200" height="80" rx="8" fill="white" stroke="#333" strokeWidth="2" />
          <text x="100" y="30" textAnchor="middle" fontWeight="bold" fontSize="14">
            Node Title
          </text>
          <text x="100" y="55" textAnchor="middle" fontSize="12" fill="#666">
            Some description text
          </text>
        </g>

        {/* Example: Another node */}
        <g transform="translate(350, 150)">
          <rect width="200" height="80" rx="8" fill="white" stroke="#333" strokeWidth="2" />
          <text x="100" y="30" textAnchor="middle" fontWeight="bold" fontSize="14">
            Another Node
          </text>
          <text x="100" y="55" textAnchor="middle" fontSize="12" fill="#666">
            More text here
          </text>
        </g>

        {/* Example: Connection line */}
        <path d="M 250 90 C 300 90, 300 190, 350 190" fill="none" stroke="#333" strokeWidth="2" />
      </svg>
    </div>
  );
}
