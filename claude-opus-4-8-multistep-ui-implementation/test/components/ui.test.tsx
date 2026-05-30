import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Modal from "@/components/Modal";
import Gallery from "@/components/Gallery";
import Dropdown from "@/components/Dropdown";
import OptionCard, { PriceTag } from "@/components/OptionCard";

describe("Modal", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <Modal open={false} onClose={() => {}}>
        body
      </Modal>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders title + body and closes on backdrop, button and Escape", async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Details" wide>
        <p>content</p>
      </Modal>,
    );
    expect(screen.getByText("Details")).toBeInTheDocument();
    expect(screen.getByRole("dialog").className).toContain("modal-shell--wide");

    // click inside shell should not close
    fireEvent.click(screen.getByText("content"));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);

    // a non-Escape key is ignored
    fireEvent.keyDown(document, { key: "Enter" });
    expect(onClose).toHaveBeenCalledTimes(2);

    // backdrop click closes
    fireEvent.click(screen.getByRole("dialog").parentElement!);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("renders without a title", () => {
    render(
      <Modal open onClose={() => {}}>
        body
      </Modal>,
    );
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });
});

describe("Gallery", () => {
  it("renders nothing without images", () => {
    const { container } = render(<Gallery images={[]} alt="x" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a single image without navigation", () => {
    render(<Gallery images={["a.jpg"]} alt="solo" />);
    expect(screen.getByAltText("solo")).toBeInTheDocument();
    expect(screen.queryByLabelText("Next image")).not.toBeInTheDocument();
  });

  it("navigates with next/prev and dots, wrapping at the ends", () => {
    render(<Gallery images={["a.jpg", "b.jpg", "c.jpg"]} alt="g" />);
    const img = () => screen.getByAltText("g") as HTMLImageElement;
    expect(img().src).toContain("a.jpg");
    fireEvent.click(screen.getByLabelText("Previous image")); // wraps to last
    expect(img().src).toContain("c.jpg");
    fireEvent.click(screen.getByLabelText("Next image")); // wraps to first
    expect(img().src).toContain("a.jpg");
    fireEvent.click(screen.getByLabelText("Image 2"));
    expect(img().src).toContain("b.jpg");
  });
});

describe("Dropdown", () => {
  const options = [
    { value: "LHR", label: "Heathrow", hint: "from £0" },
    { value: "LGW", label: "Gatwick" },
  ];

  it("shows placeholder when nothing is selected and opens to choose", async () => {
    const onChange = vi.fn();
    render(<Dropdown value={null} options={options} onChange={onChange} placeholder="Pick" />);
    expect(screen.getByText("Pick")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(screen.getByRole("option", { name: /Gatwick/ }));
    expect(onChange).toHaveBeenCalledWith("LGW");
  });

  it("falls back to a default placeholder and shows the selected label", () => {
    render(<Dropdown value="LHR" options={options} onChange={() => {}} />);
    expect(screen.getByText("Heathrow")).toBeInTheDocument();
  });

  it("does not open when disabled", async () => {
    render(<Dropdown value={null} options={options} onChange={() => {}} disabled />);
    await userEvent.click(screen.getByRole("button"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes when clicking outside", async () => {
    render(
      <div>
        <Dropdown value={null} options={options} onChange={() => {}} />
        <button>outside</button>
      </div>,
    );
    await userEvent.click(screen.getByRole("button", { name: /Select/ }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByText("outside"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});

describe("PriceTag", () => {
  it("shows Included for the baseline", () => {
    render(<PriceTag isBaseline delta={0} total={100000} currency="GBP" />);
    expect(screen.getByText("Included")).toBeInTheDocument();
    expect(screen.getByText("£1,000 total")).toBeInTheDocument();
  });

  it("shows a positive delta", () => {
    const { container } = render(<PriceTag isBaseline={false} delta={8000} total={108000} currency="GBP" />);
    expect(screen.getByText("+£80")).toBeInTheDocument();
    expect(container.querySelector(".price-delta--down")).toBeNull();
  });

  it("shows a negative delta with the down modifier", () => {
    const { container } = render(<PriceTag isBaseline={false} delta={-4000} total={96000} currency="GBP" />);
    expect(screen.getByText("-£40")).toBeInTheDocument();
    expect(container.querySelector(".price-delta--down")).not.toBeNull();
  });
});

describe("OptionCard", () => {
  it("renders media + price and fires onClick on click and keyboard", async () => {
    const onClick = vi.fn();
    render(
      <OptionCard selected media={<span>img</span>} price={<span>£1</span>} onClick={onClick}>
        <span>label</span>
      </OptionCard>,
    );
    const card = screen.getByRole("button");
    expect(card.className).toContain("is-selected");
    await userEvent.click(card);
    fireEvent.keyDown(card, { key: "Enter" });
    fireEvent.keyDown(card, { key: " " });
    fireEvent.keyDown(card, { key: "Tab" }); // ignored
    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it("renders without media or price", () => {
    const { container } = render(
      <OptionCard selected={false} onClick={() => {}}>
        <span>label</span>
      </OptionCard>,
    );
    expect(container.querySelector(".option-card-media")).toBeNull();
    expect(container.querySelector(".option-card-price")).toBeNull();
  });
});
