import "@testing-library/jest-dom";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AlertConfigurationPanel from "./AlertConfigurationPanel";
import * as professionalApi from "../api/professionalApi";

jest.mock("../api/professionalApi");
jest.mock("../../utils/toast", () => ({
  showError: jest.fn(),
  showSuccess: jest.fn(),
  confirmAction: jest.fn(),
}));

const { confirmAction } = require("../../utils/toast");

describe("AlertConfigurationPanel", () => {
  beforeEach(() => jest.clearAllMocks());

  test("offers to create a configuration when none exists yet for this runtime", async () => {
    professionalApi.listAlertConfigurations.mockResolvedValue({ items: [], total: 0 });
    render(<AlertConfigurationPanel runtimeId="r1" />);

    await waitFor(() => expect(screen.getByText("Create alert configuration")).toBeInTheDocument());
    expect(professionalApi.listAlertConfigurations).toHaveBeenCalledWith({ runtimeId: "r1", limit: 50 });
  });

  test("creating a configuration calls the API with the selected event types", async () => {
    professionalApi.listAlertConfigurations.mockResolvedValue({ items: [], total: 0 });
    professionalApi.createAlertConfiguration.mockResolvedValue({
      configuration: { configId: "c1", runtimeId: "r1", eventTypes: ["ENTRY_SIGNAL", "EXIT_SIGNAL", "ENTRY_FILLED", "EXIT_FILLED"], enabled: true, status: "ACTIVE" },
    });

    render(<AlertConfigurationPanel runtimeId="r1" />);
    await waitFor(() => expect(screen.getByText("Create alert configuration")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Create alert configuration"));

    await waitFor(() => expect(professionalApi.createAlertConfiguration).toHaveBeenCalledWith({
      runtimeId: "r1",
      eventTypes: ["ENTRY_SIGNAL", "EXIT_SIGNAL", "ENTRY_FILLED", "EXIT_FILLED"],
      enabled: true,
    }));
  });

  test("an existing ACTIVE configuration is loaded and shown with Save/Archive actions", async () => {
    professionalApi.listAlertConfigurations.mockResolvedValue({
      items: [{ configId: "c1", runtimeId: "r1", eventTypes: ["EXIT_FILLED"], enabled: true, status: "ACTIVE" }],
      total: 1,
    });

    render(<AlertConfigurationPanel runtimeId="r1" />);

    await waitFor(() => expect(screen.getByText("Save changes")).toBeInTheDocument());
    expect(screen.getByText("Archive")).toBeInTheDocument();
    // Only EXIT_FILLED's checkbox should be checked, the other three unchecked.
    const checkboxes = screen.getAllByRole("checkbox");
    const checkedCount = checkboxes.filter((c) => c.checked).length;
    expect(checkedCount).toBe(2); // EXIT_FILLED event-type checkbox + the "Enabled" checkbox
  });

  test("unchecking every event type blocks saving with a clear error, never calls the API", async () => {
    professionalApi.listAlertConfigurations.mockResolvedValue({ items: [], total: 0 });
    render(<AlertConfigurationPanel runtimeId="r1" />);
    await waitFor(() => expect(screen.getByText("Create alert configuration")).toBeInTheDocument());

    screen.getAllByRole("checkbox").forEach((checkbox) => {
      if (checkbox.checked && checkbox.labels?.[0]?.textContent !== "Enabled") {
        fireEvent.click(checkbox);
      }
    });

    fireEvent.click(screen.getByText("Create alert configuration"));
    expect(professionalApi.createAlertConfiguration).not.toHaveBeenCalled();
  });

  test("a 409 duplicate-configuration conflict on save surfaces the backend's message and reloads", async () => {
    professionalApi.listAlertConfigurations
      .mockResolvedValueOnce({ items: [], total: 0 })
      .mockResolvedValueOnce({ items: [{ configId: "c1", runtimeId: "r1", eventTypes: ["ENTRY_SIGNAL"], enabled: true, status: "ACTIVE" }], total: 1 });
    professionalApi.createAlertConfiguration.mockRejectedValue({ data: { message: "An alert configuration already exists for this runtime. Update it instead of creating another." } });

    render(<AlertConfigurationPanel runtimeId="r1" />);
    await waitFor(() => expect(screen.getByText("Create alert configuration")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Create alert configuration"));

    await waitFor(() => expect(professionalApi.listAlertConfigurations).toHaveBeenCalledTimes(2));
  });

  test("archiving requires confirmation and calls the archive API only when confirmed", async () => {
    professionalApi.listAlertConfigurations.mockResolvedValue({
      items: [{ configId: "c1", runtimeId: "r1", eventTypes: ["ENTRY_SIGNAL"], enabled: true, status: "ACTIVE" }],
      total: 1,
    });
    professionalApi.archiveAlertConfiguration.mockResolvedValue({ configuration: { configId: "c1", status: "ARCHIVED" } });
    confirmAction.mockResolvedValue(false);

    render(<AlertConfigurationPanel runtimeId="r1" />);
    await waitFor(() => expect(screen.getByText("Archive")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Archive"));
    await waitFor(() => expect(confirmAction).toHaveBeenCalled());
    expect(professionalApi.archiveAlertConfiguration).not.toHaveBeenCalled();

    confirmAction.mockResolvedValue(true);
    fireEvent.click(screen.getByText("Archive"));
    await waitFor(() => expect(professionalApi.archiveAlertConfiguration).toHaveBeenCalledWith("c1"));
  });
});
