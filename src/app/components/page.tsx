"use client";
import { useState } from "react";
import { Badge, Banner, Button, Dialog } from "@/components/ui";
import { MotionShowcase } from "@/components/design-system/motion-showcase";
import { statuses } from "@/domain/bounty";
export default function Gallery() {
  const [dark, setDark] = useState(false);
  const [dialog, setDialog] = useState(false);
  return (
    <div data-theme={dark ? "dark" : "light"} className="page">
      <h1>Component system</h1>
      <MotionShowcase />
      <label className="switch-row">
        <input
          className="switch"
          type="checkbox"
          role="switch"
          checked={dark}
          onChange={(e) => setDark(e.target.checked)}
        />
        Dark theme
      </label>
      <div className="stack">
        <section className="panel">
          <h2>Buttons</h2>
          {(["primary", "secondary", "quiet", "danger"] as const).map((v) => (
            <div className="actions" key={v}>
              <Button variant={v} size="compact">
                Compact {v}
              </Button>
              <Button variant={v}>Default {v}</Button>
              <Button variant={v} size="large">
                Long translated action label that wraps naturally
              </Button>
              <Button variant={v} disabled>
                Disabled
              </Button>
              <Button variant={v} pending>
                Saving…
              </Button>
            </div>
          ))}
        </section>
        <section className="panel">
          <h2>Selection</h2>
          <label className="terms">
            <input type="checkbox" />
            Independent choice
          </label>
          <fieldset>
            <legend>One category</legend>
            <div className="radio-group">
              <label>
                <input type="radio" name="category" defaultChecked />
                Translation
              </label>
              <label>
                <input type="radio" name="category" />
                Writing
              </label>
              <label>
                <input type="radio" name="category" disabled />
                Unavailable
              </label>
            </div>
          </fieldset>
        </section>
        <section className="panel">
          <h2>Fields</h2>
          <div className="field">
            <label htmlFor="empty">Empty field</label>
            <input id="empty" />
          </div>
          <div className="field">
            <label htmlFor="placeholder">Placeholder</label>
            <input id="placeholder" placeholder="A clear example" />
          </div>
          <div className="field">
            <label htmlFor="invalid">Invalid field</label>
            <input
              id="invalid"
              aria-invalid="true"
              aria-describedby="invalid-help"
              defaultValue="invalid"
            />
            <span id="invalid-help">Enter a clear task title.</span>
          </div>
        </section>
        <section className="panel">
          <h2>Lifecycle</h2>
          <div className="actions">
            {statuses.map((status) => (
              <Badge status={status} key={status} />
            ))}
          </div>
          <Banner>
            Transaction confirmation is separate from bounty lifecycle.
          </Banner>
          <Banner error>
            The transaction could not be verified. Check its status before
            retrying.
          </Banner>
        </section>
        <Button onClick={() => setDialog(true)}>Open dialog</Button>
        <Dialog
          open={dialog}
          onClose={() => setDialog(false)}
          title="Review the action"
        >
          <p>Escape closes this dialog. Focus returns to the trigger.</p>
          <Button onClick={() => setDialog(false)}>Done</Button>
        </Dialog>
      </div>
    </div>
  );
}
