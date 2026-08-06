import Icon from './Icon';

export default function CloseButton({ onClick }) {
  return (
    <button className="modal-close" onClick={onClick} aria-label="סגור">
      <Icon name="close" />
    </button>
  );
}
