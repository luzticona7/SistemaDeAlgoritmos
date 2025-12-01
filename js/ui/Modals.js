// js/ui/Modals.js
export class Modals {
  constructor(app) {
    this.app = app;
  }

  async customPrompt(title, def = '', type = 'text') {
    return new Promise(resolve => {
      document.getElementById('inputModalTitle').textContent = title;
      const input = document.getElementById('inputModalValue');
      input.value = def;
      input.type = type;
      input.focus();

      const confirm = () => {
        resolve(input.value.trim() || null);
        bootstrap.Modal.getInstance(document.getElementById('inputModal')).hide();
      };

      document.getElementById('inputModalConfirm').onclick = confirm;
      document.getElementById('inputModal').addEventListener('hidden.bs.modal', () => resolve(null), { once: true });
      new bootstrap.Modal(document.getElementById('inputModal')).show();
    });
  }

  showWarning(msg) {
    return new Promise(resolve => {
      const modal = document.createElement('div');
      modal.className = 'modal fade';
      modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content bg-dark text-light">
            <div class="modal-body text-center p-4">
              <p class="text-warning fs-5">${msg}</p>
              <button class="btn btn-outline-light mt-3" data-bs-dismiss="modal">OK</button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(modal);
      const bsModal = new bootstrap.Modal(modal);
      bsModal.show();
      modal.addEventListener('hidden.bs.modal', () => {
        modal.remove();
        resolve();
      });
    });
  }

  showOptimizationDialog() {
    return new Promise(resolve => {
      const modal = document.createElement('div');
      modal.className = 'modal fade';
      modal.id = 'optModal';
      modal.innerHTML = `...`; // (mismo HTML bonito que tenías)
      document.body.appendChild(modal);
      const bsModal = new bootstrap.Modal(modal);
      bsModal.show();

      modal.querySelectorAll('[data-result]').forEach(btn => {
        btn.onclick = () => {
          resolve(btn.dataset.result);
          bsModal.hide();
        };
      });

      modal.addEventListener('hidden.bs.modal', () => {
        modal.remove();
        if (!resolve.called) { resolve.called = true; resolve(null); }
      });
    });
  }
}