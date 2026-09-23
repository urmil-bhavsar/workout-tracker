export function IconButton({ label, children, onClick, type = 'button' }) { return <button className="icon-button" type={type} aria-label={label} title={label} onClick={onClick}>{children}</button> }
