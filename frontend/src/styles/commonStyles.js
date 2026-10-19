import styled from "styled-components";
import theme from "./theme";

// ─── Contenedor principal de la página ───────────────────────────────────────
export const PageContainer = styled.div`
  display: flex;
  min-height: 100vh;
  width: 100%;
  background-color: ${theme.colors.bgDark};
  color: ${theme.colors.textMain};
  position: relative;
  box-sizing: border-box;

  @media screen and (max-width: 900px) {
    flex-direction: column;
  }
`;

// ─── Contenedor de contenido flexible (hermano flex del Sidebar) ──────────────
export const ContentContainer = styled.div`
  flex: 1;
  min-width: 0;
  width: 100%;
  margin-left: 0;
  padding: 2rem 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  box-sizing: border-box;

  @media screen and (max-width: 900px) {
    padding: 1.25rem;
  }
`;

// ─── Cabecera de sección (Título + Acciones) ──────────────────────────────────
export const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  padding-bottom: 0.5rem;

  .titles {
    h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: ${theme.colors.textMain};
      letter-spacing: -0.025em;
    }
    p {
      font-size: 0.925rem;
      color: ${theme.colors.textMuted};
      margin-top: 0.25rem;
    }
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
`;

// ─── Tarjeta genérica de superficie ──────────────────────────────────────────
export const Card = styled.div`
  background-color: ${theme.colors.bgCard};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius.lg};
  box-shadow: ${theme.shadows.card};
  padding: 1.5rem;
  box-sizing: border-box;
`;

// ─── Contenedor de tabla con scroll horizontal suave ─────────────────────────
export const TableCard = styled(Card)`
  padding: 0;
  overflow: hidden;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
`;

export const TableToolbar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  background-color: ${theme.colors.bgCard};
  border-bottom: 1px solid ${theme.colors.border};
`;

export const TableResponsiveWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    height: 8px;
  }
  &::-webkit-scrollbar-track {
    background: ${theme.colors.bgDark};
  }
  &::-webkit-scrollbar-thumb {
    background: ${theme.colors.border};
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${theme.colors.primary};
  }
`;

export const TableWrapper = styled.table`
  width: 100%;
  min-width: 750px;
  border-collapse: collapse;
  text-align: left;
`;

export const TableHead = styled.thead`
  background-color: rgba(11, 19, 43, 0.7);

  th {
    padding: 1rem 1.25rem;
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${theme.colors.textMuted};
    border-bottom: 1px solid ${theme.colors.border};
    white-space: nowrap;
  }
`;

export const TableBody = styled.tbody``;

export const TableRow = styled.tr`
  border-bottom: 1px solid rgba(45, 59, 96, 0.5);
  transition: background-color 0.15s ease;

  &:hover {
    background-color: ${theme.colors.bgCardHover};
  }

  &:last-child {
    border-bottom: none;
  }
`;

export const TableCell = styled.td`
  padding: 1rem 1.25rem;
  font-size: 0.925rem;
  color: ${theme.colors.textMain};
  vertical-align: middle;
`;

// ─── Badges de Estado ─────────────────────────────────────────────────────────
export const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.75rem;
  border-radius: ${theme.radius.full};
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.025em;
  white-space: nowrap;

  ${({ $status }) => {
    switch ($status) {
      // Activo / Completado / Presente / Pagado_Total / Valido
      case "Activo":
      case "Completado":
      case "Presente":
      case "Pagado_Total":
      case "Valido":
        return `
          background-color: ${theme.colors.successLight};
          color: ${theme.colors.success};
          border: 1px solid rgba(16, 185, 129, 0.3);
        `;

      // Iniciado / Pagado_Parcial
      case "Iniciado":
      case "Pagado_Parcial":
        return `
          background-color: ${theme.colors.infoLight};
          color: #818cf8;
          border: 1px solid rgba(99, 102, 241, 0.3);
        `;

      // Pendiente / Suspendido / Licencia
      case "Pendiente":
      case "Suspendido":
      case "Licencia":
        return `
          background-color: ${theme.colors.warningLight};
          color: ${theme.colors.warning};
          border: 1px solid rgba(245, 158, 11, 0.3);
        `;

      // Inactivo / Falta / Anulado
      case "Inactivo":
      case "Falta":
      case "Anulado":
        return `
          background-color: ${theme.colors.dangerLight};
          color: ${theme.colors.danger};
          border: 1px solid rgba(239, 68, 68, 0.3);
        `;

      default:
        return `
          background-color: rgba(255, 255, 255, 0.08);
          color: ${theme.colors.textMuted};
          border: 1px solid rgba(255, 255, 255, 0.1);
        `;
    }
  }}
`;

// ─── Botones de Acción ────────────────────────────────────────────────────────
export const ActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-radius: ${theme.radius.md};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  white-space: nowrap;

  ${({ $variant }) => {
    switch ($variant) {
      case "primary":
        return `
          background-color: ${theme.colors.primary};
          color: white;
          &:hover {
            background-color: ${theme.colors.primaryHover};
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
          }
        `;
      case "success":
        return `
          background-color: ${theme.colors.success};
          color: white;
          &:hover {
            background-color: ${theme.colors.successHover};
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          }
        `;
      case "danger":
        return `
          background-color: ${theme.colors.danger};
          color: white;
          &:hover {
            background-color: ${theme.colors.dangerHover};
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
          }
        `;
      case "outline":
        return `
          background-color: transparent;
          color: ${theme.colors.textMain};
          border: 1px solid ${theme.colors.border};
          &:hover {
            background-color: rgba(255, 255, 255, 0.05);
            border-color: ${theme.colors.primary};
          }
        `;
      default:
        return `
          background-color: ${theme.colors.primary};
          color: white;
          &:hover {
            background-color: ${theme.colors.primaryHover};
          }
        `;
    }
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
  }
`;

export const CreateButton = styled(ActionButton).attrs({ $variant: "primary" })``;

export const TableActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.4rem 0.75rem;
  border-radius: ${theme.radius.sm};
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid transparent;
  white-space: nowrap;

  &:hover {
    transform: translateY(-1px);
  }
`;

export const EditButton = styled(TableActionButton)`
  background-color: rgba(14, 165, 233, 0.12);
  color: #38bdf8;
  border-color: rgba(14, 165, 233, 0.3);

  &:hover {
    background-color: rgba(14, 165, 233, 0.25);
    border-color: #38bdf8;
  }
`;

export const DeleteButton = styled(TableActionButton)`
  background-color: rgba(239, 68, 68, 0.12);
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.3);

  &:hover {
    background-color: rgba(239, 68, 68, 0.25);
    border-color: #f87171;
  }
`;

export const ViewButton = styled(TableActionButton)`
  background-color: rgba(16, 185, 129, 0.12);
  color: #34d399;
  border-color: rgba(16, 185, 129, 0.3);

  &:hover {
    background-color: rgba(16, 185, 129, 0.25);
    border-color: #34d399;
  }
`;

// ─── Inputs y Formularios Reutilizables ────────────────────────────────────────
export const SearchInput = styled.input`
  padding: 0.625rem 1rem;
  background-color: ${theme.colors.bgInput};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textMain};
  font-size: 0.875rem;
  min-width: 260px;
  max-width: 100%;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
  }

  &::placeholder {
    color: ${theme.colors.textDim};
  }
`;

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;

  &.full {
    grid-column: 1 / -1;
  }
`;

export const Label = styled.label`
  font-size: 0.75rem;
  color: ${theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
`;

export const FormInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  background-color: ${theme.colors.bgInput};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textMain};
  font-size: 0.875rem;
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
  }

  &::placeholder {
    color: ${theme.colors.textDim};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const FormSelect = styled.select`
  width: 100%;
  padding: 0.75rem 1rem;
  background-color: ${theme.colors.bgInput};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textMain};
  font-size: 0.875rem;
  box-sizing: border-box;
  cursor: pointer;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
  }

  option {
    background-color: ${theme.colors.bgCard};
    color: ${theme.colors.textMain};
  }
`;

export const FormTextarea = styled.textarea`
  width: 100%;
  padding: 0.75rem 1rem;
  background-color: ${theme.colors.bgInput};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textMain};
  font-size: 0.875rem;
  box-sizing: border-box;
  min-height: 80px;
  resize: vertical;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
  }

  &::placeholder {
    color: ${theme.colors.textDim};
  }
`;

export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
`;

export const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1.5rem;
`;
