import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { AlertTriangle } from "lucide-react";
import theme from "../styles/theme";
import Modal from "./Modal";

const MessageText = styled.p`
  font-size: 0.95rem;
  color: ${theme.colors.textMain};
  line-height: 1.5;
  margin-bottom: 1.25rem;
`;

const WarningBox = styled.div`
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: ${theme.radius.md};
  padding: 0.85rem 1rem;
  margin-bottom: 1.25rem;
  font-size: 0.825rem;
  color: #fca5a5;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-bottom: 1.25rem;
`;

const Label = styled.label`
  font-size: 0.75rem;
  color: ${theme.colors.textMuted};
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.05em;
`;

const Textarea = styled.textarea`
  padding: 0.75rem 1rem;
  background-color: ${theme.colors.bgInput};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textMain};
  font-size: 0.875rem;
  width: 100%;
  box-sizing: border-box;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;

  &:focus {
    outline: none;
    border-color: ${theme.colors.danger};
  }
`;

const ActionsContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
`;

const CancelBtn = styled.button`
  padding: 0.65rem 1.25rem;
  border-radius: ${theme.radius.md};
  border: 1px solid ${theme.colors.border};
  background: transparent;
  color: ${theme.colors.textMuted};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
    color: ${theme.colors.textMain};
  }
`;

const ConfirmBtn = styled.button`
  padding: 0.65rem 1.25rem;
  border-radius: ${theme.radius.md};
  border: none;
  background-color: ${({ $isDanger }) => ($isDanger ? theme.colors.danger : theme.colors.primary)};
  color: #ffffff;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background-color: ${({ $isDanger }) => ($isDanger ? theme.colors.dangerHover : theme.colors.primaryHover)};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

/**
 * ConfirmModal: Reemplazo moderno y elegante para window.confirm y window.prompt
 * Evita bloqueos del navegador y garantiza consistencia en todas las vistas.
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "¿Confirmar acción?",
  message = "¿Está seguro de continuar?",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isDanger = true,
  requireReason = false,
  reasonPlaceholder = "Ingrese el motivo de la anulación...",
  loading = false,
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setError("");
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (requireReason) {
      if (!reason.trim() || reason.trim().length < 5) {
        setError("El motivo es obligatorio (mínimo 5 caracteres).");
        return;
      }
      onConfirm(reason.trim());
    } else {
      onConfirm();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="500px">
      <MessageText>{message}</MessageText>

      {isDanger && (
        <WarningBox>
          <AlertTriangle size={18} style={{ color: "#ef4444", flexShrink: 0 }} />
          <span>Esta acción es irreversible y afectará los registros contables.</span>
        </WarningBox>
      )}

      {requireReason && (
        <FormGroup>
          <Label>Motivo de la Anulación *</Label>
          <Textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError("");
            }}
            placeholder={reasonPlaceholder}
            autoFocus
          />
          {error && (
            <span style={{ color: theme.colors.danger, fontSize: "0.75rem", fontWeight: 600 }}>
              {error}
            </span>
          )}
        </FormGroup>
      )}

      <ActionsContainer>
        <CancelBtn type="button" onClick={onClose} disabled={loading}>
          {cancelText}
        </CancelBtn>
        <ConfirmBtn
          type="button"
          $isDanger={isDanger}
          onClick={handleConfirm}
          disabled={loading || (requireReason && reason.trim().length < 5)}
        >
          {loading ? "Procesando..." : confirmText}
        </ConfirmBtn>
      </ActionsContainer>
    </Modal>
  );
}

export default ConfirmModal;
