import { ProductStudioClient } from "../../product-studio/components/ProductStudioClient";
import { WorkflowSteps } from "./WorkflowSteps";
import { WorkspaceNotice } from "./WorkspaceNotice";
import styles from "./workspace-components.module.css";

export function WorkspaceShell() {
  return (
    <div className={styles.workspaceShell}>
      <WorkflowSteps activeStep="SOURCE" />

      <WorkspaceNotice />

      <ProductStudioClient />
    </div>
  );
}
