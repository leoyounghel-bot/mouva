import React, { useEffect, forwardRef, Ref, useRef, useMemo } from 'react';
import MoveableComponent, {
  OnDrag,
  OnRotate,
  OnRotateEnd,
  OnClick,
  OnResize,
} from 'react-moveable';
import { uuid } from '../../../helper.js';
import { theme } from 'antd';

type Props = {
  target: HTMLElement[];
  bounds: { left: number; top: number; bottom: number; right: number };
  horizontalGuidelines: number[];
  verticalGuidelines: number[];
  keepRatio: boolean;
  rotatable: boolean;
  onDrag: ({ target, left, top }: OnDrag) => void;
  onDragEnd: ({ target }: { target: HTMLElement | SVGElement }) => void;
  onDragGroupEnd: ({ targets }: { targets: (HTMLElement | SVGElement)[] }) => void;
  onRotate: ({ target, rotate }: OnRotate) => void;
  onRotateEnd: ({ target }: OnRotateEnd) => void;
  onRotateGroupEnd: ({ targets }: { targets: (HTMLElement | SVGElement)[] }) => void;
  onResize: ({ target, width, height, direction }: OnResize) => void;
  onResizeEnd: ({ target }: { target: HTMLElement | SVGElement }) => void;
  onResizeGroupEnd: ({ targets }: { targets: (HTMLElement | SVGElement)[] }) => void;
  resizable: boolean;
  draggable: boolean;
  onClick: (e: OnClick) => void;
};

const baseClassName = 'pdfme-moveable';

/**
 * Build scoped CSS for Notion-style selection handles.
 * All selectors are scoped under `.${cls}` to prevent leaking.
 */
const buildNotionCSS = (cls: string, color: string): string => `
  /* ── Border lines: solid 2px ── */
  .${cls} .moveable-line.moveable-direction {
    background: ${color} !important;
    height: 2px !important;
    --moveable-color: ${color};
  }

  /* ── All handles base: white circle ── */
  .${cls} .moveable-control.moveable-direction {
    background: #fff !important;
    border: 2px solid ${color} !important;
    border-radius: 50% !important;
    width: 10px !important;
    height: 10px !important;
    margin-top: -5px !important;
    margin-left: -5px !important;
    box-shadow: 0 0 0 1px rgba(0,0,0,.05), 0 1px 3px rgba(0,0,0,.12) !important;
  }

  /* ── Edge (midpoint) handles: pill shape ── */
  .${cls} .moveable-control.moveable-direction.moveable-n,
  .${cls} .moveable-control.moveable-direction.moveable-s {
    width: 20px !important;
    height: 8px !important;
    border-radius: 4px !important;
    margin-top: -4px !important;
    margin-left: -10px !important;
    cursor: ns-resize !important;
  }
  .${cls} .moveable-control.moveable-direction.moveable-e,
  .${cls} .moveable-control.moveable-direction.moveable-w {
    width: 8px !important;
    height: 20px !important;
    border-radius: 4px !important;
    margin-top: -10px !important;
    margin-left: -4px !important;
    cursor: ew-resize !important;
  }

  /* ── Corner handles: keep circle but slightly larger ── */
  .${cls} .moveable-control.moveable-direction.moveable-nw,
  .${cls} .moveable-control.moveable-direction.moveable-ne,
  .${cls} .moveable-control.moveable-direction.moveable-sw,
  .${cls} .moveable-control.moveable-direction.moveable-se {
    width: 10px !important;
    height: 10px !important;
    border-radius: 50% !important;
    margin-top: -5px !important;
    margin-left: -5px !important;
  }

  /* ── Hide the origin crosshair ── */
  .${cls} .moveable-control.moveable-origin {
    display: none !important;
  }

  /* ── Rotation line ── */
  .${cls} .moveable-line.moveable-rotation-line {
    background: ${color} !important;
    height: 1px !important;
    opacity: 0.6;
    --moveable-color: ${color};
  }

  /* ── Rotation control: white circle with border ── */
  .${cls} .moveable-control.moveable-rotation-control {
    background: #fff !important;
    border: 2px solid ${color} !important;
    border-radius: 50% !important;
    width: 12px !important;
    height: 12px !important;
    margin-top: -6px !important;
    margin-left: -6px !important;
    box-shadow: 0 1px 3px rgba(0,0,0,.15) !important;
  }
`;

const Moveable = (props: Props, ref: Ref<MoveableComponent>) => {
  const { token } = theme.useToken();
  const instanceId = useRef(uuid());
  const uniqueClassName = `${baseClassName}-${instanceId.current}`;

  // Build scoped CSS string whenever the theme color changes
  const notionStyles = useMemo(
    () => buildNotionCSS(uniqueClassName, token.colorPrimary),
    [uniqueClassName, token.colorPrimary],
  );

  useEffect(() => {
    const containerElement = document.querySelector(`.${uniqueClassName}`);
    const moveableLines = document.querySelectorAll(`.${uniqueClassName} .moveable-line`);
    if (containerElement instanceof HTMLElement) {
      containerElement.style.setProperty('--moveable-color', token.colorPrimary);
      moveableLines.forEach((e) => {
        if (e instanceof HTMLElement) {
          e.style.setProperty('--moveable-color', token.colorPrimary);
        }
      });
    }
  }, [props.target, token.colorPrimary, uniqueClassName]);

  return (
    <>
      {/* Scoped Notion-style overrides */}
      <style>{notionStyles}</style>
      <MoveableComponent
        className={uniqueClassName}
        rootContainer={document ? document.body : undefined}
        snappable
        draggable={props.draggable}
        rotatable={props.rotatable}
        resizable={props.resizable}
        throttleDrag={1}
        throttleRotate={1}
        throttleResize={1}
        ref={ref}
        target={props.target}
        bounds={props.bounds}
        horizontalGuidelines={props.horizontalGuidelines}
        verticalGuidelines={props.verticalGuidelines}
        keepRatio={props.keepRatio}
        onRotate={props.onRotate}
        onRotateEnd={props.onRotateEnd}
        onRotateGroup={({ events }: { events: OnRotate[] }) => {
          events.forEach(props.onRotate);
        }}
        onRotateGroupEnd={props.onRotateGroupEnd}
        onDrag={props.onDrag}
        onDragGroup={({ events }: { events: OnDrag[] }) => {
          events.forEach(props.onDrag);
        }}
        onDragEnd={props.onDragEnd}
        onDragGroupEnd={props.onDragGroupEnd}
        onResize={props.onResize}
        onResizeGroup={({ events }: { events: OnResize[] }) => {
          events.forEach(props.onResize);
        }}
        onResizeEnd={props.onResizeEnd}
        onResizeGroupEnd={props.onResizeGroupEnd}
        onClick={props.onClick}
      />
    </>
  );
};

export default forwardRef<MoveableComponent, Props>(Moveable);
