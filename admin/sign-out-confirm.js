let pending;

// One confirmation surface for the portal, website editor and login screen.
export function confirmSignOut() {
  if (pending) return pending;
  pending = new Promise(resolve => {
    const opener = document.activeElement;
    const fallback = opener?.closest('details')?.querySelector('summary');
    const dialog = document.createElement('dialog');
    dialog.setAttribute('data-signout-confirm', '');
    dialog.setAttribute('aria-labelledby', 'cm-signout-title');
    dialog.setAttribute('aria-describedby', 'cm-signout-description');
    dialog.innerHTML = `<style>
      [data-signout-confirm]{box-sizing:border-box;width:min(440px,calc(100vw - 32px));max-height:calc(100dvh - 32px);margin:auto;padding:24px;border:1px solid #ded6c9;border-radius:8px;background:#fffefa;color:#292d25;box-shadow:0 20px 70px #171b2433;font-family:"Google Sans","Google Sans Thai","Noto Sans Thai",system-ui,sans-serif;letter-spacing:0;overflow:auto}
      [data-signout-confirm]::backdrop{background:#171b2470}
      [data-signout-confirm] h2{margin:0 0 10px;font-size:20px;line-height:1.5;color:inherit;letter-spacing:0}
      [data-signout-confirm] p{margin:0;font-size:14px;line-height:1.7;color:#63675d}
      [data-signout-confirm] footer{display:flex;justify-content:flex-end;gap:10px;margin-top:24px;padding:0;background:none;border:0}
      [data-signout-confirm] button{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 16px;border:1px solid #d8cebd;border-radius:6px;background:#fffefa;color:#30352c;font:inherit;font-size:14px;font-weight:600;line-height:1.5;cursor:pointer;letter-spacing:0}
      [data-signout-confirm] button[value=confirm]{background:#a4511d;border-color:#a4511d;color:white}
      [data-signout-confirm] button:hover{filter:brightness(.96)}
      [data-signout-confirm] button:focus-visible{outline:2px solid #63854e;outline-offset:3px}
      @media(max-width:480px){[data-signout-confirm]{padding:20px}[data-signout-confirm] footer>button{flex:1;padding-inline:10px}}
    </style><h2 id="cm-signout-title">ออกจากระบบไหม?</h2>
    <p id="cm-signout-description">ข้อมูลที่ยังไม่ได้บันทึกอาจสูญหาย ร่างที่บันทึกแล้วและข้อมูลที่เผยแพร่จะไม่ถูกลบ</p>
    <footer><button type="button" value="cancel" autofocus>ทำงานต่อ</button><button type="button" value="confirm">ออกจากระบบ</button></footer>`;
    const previousOverflow = document.body.style.overflow;
    const finish = confirmed => {
      dialog.remove();
      document.body.style.overflow = previousOverflow;
      const target = opener?.isConnected && opener.getClientRects().length ? opener : fallback;
      target?.focus({preventScroll:true});
      resolve(confirmed);
    };
    dialog.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (button) finish(button.value === 'confirm');
    });
    dialog.addEventListener('cancel', event => { event.preventDefault(); finish(false); });
    // Underlying drawers must not consume Escape/Tab while this top-layer dialog is open.
    dialog.addEventListener('keydown', event => event.stopPropagation());
    document.body.append(dialog);
    document.body.style.overflow = 'hidden';
    dialog.showModal();
  }).finally(() => { pending = null; });
  return pending;
}
