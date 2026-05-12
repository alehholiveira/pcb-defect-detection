1. **Instale o Miniconda**
2. Abra o terminal na pasta raiz do projeto e rode o comando para construir o ambiente:
   ```bash
   conda env create -f environment.yml
   ```
3. Ative o ambiente:
   ```bash
   conda activate pcb-defect
   ```
4. Adicione esse Kernel ao Jupyter:
   ```bash
   python -m ipykernel install --user --name pcb-defect --display-name "Python (pcb-defect)"
   ```
