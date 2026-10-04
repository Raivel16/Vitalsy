import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import App from "./App";

describe("App", () => {
  it("renders the Vitalsy heading", () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", { name: /Vitalsy/i }),
    ).toBeInTheDocument();
  });
});
