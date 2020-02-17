import * as React from "react";
import { useStore } from "effector-react";
import * as antd from "antd";
import styled from "styled-components";
import { useMousetrap } from "lib/use-mousetrap";
import { MessageFormatted } from "lib/api-git";
import { Column, Row } from "ui";

import { $types, $scopes } from "./model";

export interface CommitFormProps {
  value: MessageFormatted;
  onChange?: (value: MessageFormatted) => void;
  onSave?: () => void;
}

export const CommitForm: React.FC<CommitFormProps> = (props) => {
  const { value, onChange = () => {}, onSave = () => {} } = props;

  const types = useStore($types);
  const scopes = useStore($scopes);

  const { ref: messageRef } = useMousetrap("command+enter", onSave);

  const changeType = React.useCallback(
    (type: string) => {
      onChange({ ...value, type });
    },
    [onChange, value],
  );

  const changeNote = React.useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange({ ...value, note: event.currentTarget.value });
    },
    [onChange, value],
  );

  const formatNote = React.useCallback(() => {
    const [firstLine, secondLine, ...otherLines] = value.note.split("\n");

    if (!(secondLine === undefined || secondLine === "")) {
      onChange({
        ...value,
        note: [firstLine, "", secondLine, ...otherLines].join("\n"),
      });
    }
  }, [onChange, value]);

  const changeScope = React.useCallback(
    (scope: string[]) => {
      onChange({ ...value, scope: scope[scope.length - 1] || "" });
    },
    [onChange, value],
  );

  return (
    <Container>
      <Row style={{ flexWrap: "nowrap" }}>
        <antd.Select
          className="select"
          value={value.type}
          onChange={changeType}
          style={{ minWidth: "90px" }}
        >
          {types.map((typeValue) => (
            <antd.Select.Option key={typeValue} value={typeValue}>
              {typeValue}
            </antd.Select.Option>
          ))}
        </antd.Select>

        <antd.Select
          mode="tags"
          placeholder="Scope"
          value={value.scope ? [value.scope] : []}
          onChange={changeScope}
          style={{ width: "100%" }}
        >
          {scopes.map((scope) => (
            <antd.Select.Option key={scope} value={scope}>
              {scope}
            </antd.Select.Option>
          ))}
        </antd.Select>
      </Row>

      <TextArea
        placeholder="Message (⌘Enter to commit)"
        ref={messageRef}
        autoSize={{ maxRows: 4 }}
        value={value.note}
        onChange={changeNote}
        onBlur={formatNote}
      />
    </Container>
  );
};

const Container = styled(Column)``;

const TextArea = styled(antd.Input.TextArea)`
  /* max-width: calc(16 * 24px) !important;
   */
`;
