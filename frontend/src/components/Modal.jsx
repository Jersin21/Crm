import React, { useEffect } from "react";
import styled from "styled-components";
import theme from "../styles/theme";

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgba(5, 10, 23, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1.25rem;
  overflow-y: auto;
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const ModalContainer = styled.div`
  background-color: ${theme.colors.bgCard};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius.lg};
  box-shadow: ${theme.shadows.modal};
  width: 100%;
  max-width: ${({ $maxWidth }) => $maxWidth || "560px"};
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);

  @keyframes slideUp {
    from {
      transform: translateY(20px) scale(0.97);
      opacity: 0;
    }
    to {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }
`;

const Header = styled.div`
  padding: 1.25rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid ${theme.colors.border};
  background-color: rgba(11, 19, 43, 0.4);

  h2 {
    font-size: 1.25rem;
    font-weight: 700;
    color: ${theme.colors.textMain};
    letter-spacing: -0.01em;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;

const CloseButton = styled.button`
  background: transparent;
  border: 1px solid transparent;
  border-radius: ${theme.radius.sm};
  color: ${theme.colors.textMuted};
  font-size: 1.35rem;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;

  &:hover {
    color: ${theme.colors.textMain};
    background-color: rgba(255, 255, 255, 0.08);
  }
`;

const Body = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${theme.colors.border};
    border-radius: 3px;
  }
`;

const Modal = ({ isOpen, onClose, title, children, maxWidth = "560px" }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <Overlay onClick={(e) => e.target === e.currentTarget && onClose()}>
      <ModalContainer $maxWidth={maxWidth} role="dialog" aria-modal="true">
        <Header>
          <h2>{title}</h2>
          <CloseButton onClick={onClose} aria-label="Cerrar modal">
            &times;
          </CloseButton>
        </Header>
        <Body>{children}</Body>
      </ModalContainer>
    </Overlay>
  );
};

export default Modal;
