import * as React from 'react';
import { useState, useImperativeHandle } from 'react';
import classNames from 'classnames';
import pickAttrs from 'rc-util/lib/pickAttrs';
import KeyCode from 'rc-util/lib/KeyCode';
// import Overflow from 'rc-overflow';
import TransBtn from '../TransBtn';
import type {
  LabelValueType,
  DisplayLabelValueType,
  RawValueType,
  CustomTagProps,
  DefaultValueType,
} from '../interface/generator';
import type { RenderNode } from '../interface';
import type { InnerSelectorProps } from '.';
import Input from './Input';
import useLayoutEffect from '../hooks/useLayoutEffect';

interface SelectorProps extends InnerSelectorProps {
  // Icon
  removeIcon?: RenderNode;

  // Tags
  maxTagCount?: number | 'responsive';
  maxTagTextLength?: number;
  maxTagPlaceholder?: React.ReactNode | ((omittedValues: LabelValueType[]) => React.ReactNode);
  tokenSeparators?: string[];
  tagRender?: (props: CustomTagProps) => React.ReactElement;
  onToggleOpen: (open?: boolean) => void;

  // Motion
  choiceTransitionName?: string;

  // Event
  onSelect: (value: RawValueType, option: { selected: boolean }) => void;

  // ref
  ref: React.Ref<RefMultiSelectorProps>;
}

const onPreventMouseDown = (event: React.MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();
};

export interface RefMultiSelectorProps {
  onKeyDown: React.KeyboardEventHandler;
  getLastEnabledIndex: () => number;
  setInputIndex: (index: number) => void;
  getChosenList: () => RawValueType[];
  clearChosenList: () => void;
  setChosenValue: (values: RawValueType[]) => void;
}

const SelectSelector: React.FC<SelectorProps> = React.forwardRef((props, ref) => {
  const {
    id,
    prefixCls,

    values,
    open,
    searchValue,
    inputRef,
    placeholder,
    disabled,
    mode,
    showSearch,
    autoFocus,
    autoComplete,
    accessibilityIndex,
    tabIndex,

    removeIcon,

    // maxTagCount,
    maxTagTextLength,
    // maxTagPlaceholder = (omittedValues: LabelValueType[]) => `+ ${omittedValues.length} ...`,
    tagRender,
    onToggleOpen,

    onSelect,
    onInputChange,
    onInputPaste,
    onInputKeyDown,
    onInputMouseDown,
    onInputCompositionStart,
    onInputCompositionEnd,
  } = props;

  const measureRef = React.useRef<HTMLSpanElement>(null);
  const [inputWidth, setInputWidth] = useState(0);
  const [focused, setFocused] = useState(false);
  const [inputOrder, setInputOrder] = useState(0); // 从右至左计数
  const [chosenList, setChosenList] = useState<RawValueType[]>([]);

  useImperativeHandle(ref, () => ({
    onKeyDown: (e) => {
      const { which, metaKey } = e;
      if (which === KeyCode.LEFT) {
        if (inputOrder < values.length) {
          setInputOrder(inputOrder + 1);
        }
        setChosenList([]);
      } else if (which === KeyCode.RIGHT) {
        if (inputOrder > 0) {
          setInputOrder(inputOrder - 1);
        }
        setChosenList([]);
      } else if (which === KeyCode.A && metaKey) {
        setChosenList(values.map((val) => val.value));
      }
    },
    getLastEnabledIndex: () => {
      return values.length - inputOrder - 1;
    },
    getChosenList: () => {
      return chosenList;
    },
    clearChosenList: () => {
      setChosenList([]);
    },
    setInputIndex: (index: number) => {
      setInputOrder(index);
    },
    setChosenValue: (valList: RawValueType[]) => {
      setChosenList(valList);
    },
  }));

  const selectionPrefixCls = `${prefixCls}-selection`;

  // ===================== Search ======================
  const inputValue = open || mode === 'tags' ? searchValue : '';
  const inputEditable: boolean = mode === 'tags' || (showSearch && (open || focused));

  // We measure width and set to the input immediately
  useLayoutEffect(() => {
    setInputWidth(measureRef.current.scrollWidth);
  }, [inputValue]);

  // ===================== Render ======================
  // >>> Render Selector Node. Includes Item & Rest
  function defaultRenderSelector(
    value: DefaultValueType,
    content: React.ReactNode,
    itemDisabled: boolean,
    closable?: boolean,
    onClose?: React.MouseEventHandler,
    chosen?: boolean,
  ) {
    const onMouseDown = (e: React.MouseEvent) => {
      // onPreventMouseDown(e);
      // onToggleOpen(!open);
      const multi = e.metaKey;
      if (multi) {
        setChosenList((list) =>
          chosen ? list.filter((v) => v !== value) : [].concat(list, value),
        );
      } else {
        setChosenList([value] as RawValueType[]);
        const index = values.map((val) => val.value).indexOf(value as RawValueType);
        setInputOrder(values.length - index - 1);
      }
    };
    return (
      <span
        className={classNames(`${selectionPrefixCls}-item`, {
          [`${selectionPrefixCls}-item-disabled`]: itemDisabled,
          'item-chosen': chosen,
        })}
        onMouseDown={onMouseDown}
      >
        <span className={`${selectionPrefixCls}-item-content`}>{content}</span>
        {closable && (
          <TransBtn
            className={`${selectionPrefixCls}-item-remove`}
            onMouseDown={onPreventMouseDown}
            onClick={onClose}
            customizeIcon={removeIcon}
          >
            ×
          </TransBtn>
        )}
      </span>
    );
  }

  function customizeRenderSelector(
    value: DefaultValueType,
    content: React.ReactNode,
    itemDisabled: boolean,
    closable: boolean,
    onClose: React.MouseEventHandler,
    chosen: boolean,
  ) {
    const onMouseDown = (e: React.MouseEvent) => {
      onPreventMouseDown(e);
      onToggleOpen(!open);
      const multi = e.metaKey;
      if (multi) {
        setChosenList((list) =>
          chosen ? list.filter((v) => v !== value) : [].concat(list, value),
        );
      } else {
        setChosenList([value] as RawValueType[]);
      }
    };

    return (
      <span onMouseDown={onMouseDown} className={chosen ? 'chosen' : ''}>
        {tagRender({
          label: content,
          value,
          disabled: itemDisabled,
          closable,
          onClose,
        })}
      </span>
    );
  }

  function renderItem({ disabled: itemDisabled, label, value }: DisplayLabelValueType) {
    const closable = !disabled && !itemDisabled;

    let displayLabel: React.ReactNode = label;

    if (typeof maxTagTextLength === 'number') {
      if (typeof label === 'string' || typeof label === 'number') {
        const strLabel = String(displayLabel);

        if (strLabel.length > maxTagTextLength) {
          displayLabel = `${strLabel.slice(0, maxTagTextLength)}...`;
        }
      }
    }

    const onClose = (event?: React.MouseEvent) => {
      if (event) event.stopPropagation();
      onSelect(value, { selected: false });
    };

    const chosen = chosenList.indexOf(value) >= 0;

    return typeof tagRender === 'function'
      ? customizeRenderSelector(value, displayLabel, itemDisabled, closable, onClose, chosen)
      : defaultRenderSelector(value, displayLabel, itemDisabled, closable, onClose, chosen);
  }

  // function renderRest(omittedValues: DisplayLabelValueType[]) {
  //   const content =
  //     typeof maxTagPlaceholder === 'function'
  //       ? maxTagPlaceholder(omittedValues)
  //       : maxTagPlaceholder;

  //   return defaultRenderSelector(content, false);
  // }

  // >>> Input Node
  const inputNode = (
    <div
      className={`${selectionPrefixCls}-search`}
      style={{ width: inputWidth }}
      onFocus={() => {
        setFocused(true);
      }}
      onBlur={() => {
        setFocused(false);
      }}
    >
      <Input
        ref={inputRef}
        open={open}
        prefixCls={prefixCls}
        id={id}
        inputElement={null}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        editable={inputEditable}
        accessibilityIndex={accessibilityIndex}
        value={inputValue}
        onKeyDown={onInputKeyDown}
        onMouseDown={onInputMouseDown}
        onChange={onInputChange}
        onPaste={onInputPaste}
        onCompositionStart={onInputCompositionStart}
        onCompositionEnd={onInputCompositionEnd}
        tabIndex={tabIndex}
        attrs={pickAttrs(props, true)}
      />

      {/* Measure Node */}
      <span ref={measureRef} className={`${selectionPrefixCls}-search-mirror`} aria-hidden>
        {inputValue}&nbsp;
      </span>
    </div>
  );

  // >>> Selections
  const selectionNode = (
    // <Overflow
    //   prefixCls={`${selectionPrefixCls}-overflow`}
    //   data={values}
    //   renderItem={renderItem}
    //   renderRest={renderRest}
    //   suffix={inputNode}
    //   itemKey="key"
    //   maxCount={maxTagCount}
    // />
    <>
      {values.map((value, index) => {
        const item = renderItem({ label: value.label, value: value.value });
        if (inputOrder === values.length - index) {
          return (
            <>
              {inputNode}
              {item}
            </>
          );
        }
        return item;
      })}
      {inputOrder === 0 ? inputNode : null}
    </>
  );

  return (
    <>
      {selectionNode}

      {!values.length && !inputValue && (
        <span className={`${selectionPrefixCls}-placeholder`}>{placeholder}</span>
      )}
    </>
  );
});

export default SelectSelector;
