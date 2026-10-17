// =============================================================
// ChefUnitPlus - Admin : Detail des preuves d'un utilisateur
// Permet de valider ou rejeter un utilisateur
// =============================================================

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter/services.dart';

import '../../core/constants/app_colors.dart';
import '../../services/api_client.dart';
import '../../services/user_service.dart';

class UserProofsDetailScreen extends StatefulWidget {
  final String userId;

  const UserProofsDetailScreen({
    super.key,
    required this.userId,
  });

  @override
  State<UserProofsDetailScreen> createState() =>
      _UserProofsDetailScreenState();
}

class _UserProofsDetailScreenState extends State<UserProofsDetailScreen> {
  Map<String, dynamic>? _user;
  List<dynamic> _proofs = [];
  bool _isRAS = false;
  bool _loading = true;
  String? _error;
  bool _processing = false;

  @override
  void initState() {
    super.initState();
    _loadUserProofs();
  }

  Future<void> _loadUserProofs() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      // Recuperer l'ApiClient PARTAGE (avec token) via Provider
      final api = context.read<ApiClient>();
      final userService = UserService(api);
      final result = await userService.getUserProofs(widget.userId);

      if (!mounted) return;

      final data = result['data'] ?? result;
      setState(() {
        _user = data['user'] as Map<String, dynamic>?;
        _proofs = (data['proofs'] as List?) ?? [];
      // PATCH VALIDATION CONDITIONNELLE
      final fonction = (_user?['fonction'] ?? '').toString().trim();
      _isRAS = fonction == 'RAS' || fonction.isEmpty || fonction.toLowerCase() == 'ras';
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Erreur : ' + e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _validate() async {
    final confirm = await _showConfirmDialog(
      'Valider cet utilisateur',
      'L utilisateur sera active et pourra acceder a son compte.',
      'Valider',
      AppColors.success,
    );

    if (confirm != true) return;

    setState(() => _processing = true);

    try {
      // Recuperer l'ApiClient PARTAGE (avec token) via Provider
      final api = context.read<ApiClient>();
      final userService = UserService(api);
      final result = await userService.validateUser(widget.userId);

      if (!mounted) return;

      if (result['success'] == true) {
        _showSnackbar('Utilisateur valide avec succes', AppColors.success);
        Navigator.pop(context);
      } else {
        _showSnackbar(result['message'] ?? 'Erreur', AppColors.danger);
      }
    } catch (e) {
      if (!mounted) return;
      _showSnackbar('Erreur : ' + e.toString(), AppColors.danger);
    } finally {
      if (mounted) setState(() => _processing = false);
    }
  }

  Future<void> _reject() async {
    final reasonCtrl = TextEditingController();

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Rejeter cet utilisateur'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'L utilisateur ne pourra pas acceder a son compte.',
              style: TextStyle(fontSize: 13),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: reasonCtrl,
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'Raison du rejet (optionnel)',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.danger,
              foregroundColor: Colors.white,
            ),
            child: const Text('Rejeter'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _processing = true);

    try {
      // Recuperer l'ApiClient PARTAGE (avec token) via Provider
      final api = context.read<ApiClient>();
      final userService = UserService(api);
      final result = await userService.rejectUser(
        widget.userId,
        reason: reasonCtrl.text.trim(),
      );

      if (!mounted) return;

      if (result['success'] == true) {
        _showSnackbar('Utilisateur rejete', AppColors.warning);
        Navigator.pop(context);
      } else {
        _showSnackbar(result['message'] ?? 'Erreur', AppColors.danger);
      }
    } catch (e) {
      if (!mounted) return;
      _showSnackbar('Erreur : ' + e.toString(), AppColors.danger);
    } finally {
      if (mounted) setState(() => _processing = false);
    }
  }

  Future<bool?> _showConfirmDialog(
    String title,
    String message,
    String confirmLabel,
    Color color,
  ) {
    return showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: Text(message, style: const TextStyle(fontSize: 13)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: color,
              foregroundColor: Colors.white,
            ),
            child: Text(confirmLabel),
          ),
        ],
      ),
    );
  }

  void _showSnackbar(String message, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: color,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        leading: const BackButton(),
        title: const Text('Detail des preuves'),
        backgroundColor: AppColors.mauve,
        foregroundColor: Colors.white,
      ),
      body: SafeArea(
        child: _buildBody(),
      ),
      bottomNavigationBar: (_user != null && !_loading)
          ? _buildActionBar()
          : null,
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.mauve),
      );
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _buildProofsBadge(),
              _buildProofsList(),
              const Icon(Icons.error_outline,
                  color: AppColors.danger, size: 64),
              const SizedBox(height: 16),
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _loadUserProofs,
                child: const Text('Reessayer'),
              ),
            ],
          ),
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildUserCard(),
          const SizedBox(height: 24),
          const Text(
            'Preuves soumises',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          if (_proofs.isEmpty)
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Aucune preuve',
                style: TextStyle(color: AppColors.textMuted),
              ),
            )
          else
            ..._proofs.asMap().entries.map((entry) {
              return _buildProofCard(entry.key + 1, entry.value);
            }),
        ],
      ),
    );
  }

  Widget _buildUserCard() {
    if (_user == null) return const SizedBox.shrink();

    final fullName = _user!['full_name'] ?? 'Utilisateur';
    final email = _user!['email'] ?? '';
    final fonction = _user!['fonction'] ?? 'N/A';
    final buchettes = _user!['buchettes'] ?? 0;
    final registrationCode = _user!['registration_code'] ?? '';
    final codeIsUsed = _user!['code_is_used'] == true;
    final phone = _user!['phone'] ?? '';
    final adresse = _user!['adresse'] ?? '';

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: AppColors.mauve,
                  child: Text(
                    fullName.isNotEmpty ? fullName[0].toUpperCase() : '?',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        fullName,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        email,
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const Divider(height: 24),
            if (registrationCode.isNotEmpty)
              Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.kakiSoft,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.vpn_key, size: 22, color: AppColors.kaki),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Code de verification',
                          style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                        ),
                        Text(
                          registrationCode,
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 3,
                            color: AppColors.kaki,
                          ),
                        ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(
                          codeIsUsed ? Icons.check_circle : Icons.cancel,
                          size: 14,
                          color: codeIsUsed ? Colors.green : Colors.red,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          codeIsUsed ? 'Code utilise' : 'Code non utilise',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: codeIsUsed ? Colors.green : Colors.red,
                          ),
                        ),
                      ],
                    ),

                      ],
                    ),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.copy, color: AppColors.kaki),
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: registrationCode));
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Code copie'), duration: Duration(seconds: 1)),
                        );
                      },
                    ),
                  ],
                ),
              ),
            if (phone.isNotEmpty) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.phone, size: 16, color: AppColors.mauve),
                  const SizedBox(width: 8),
                  Text(phone, style: const TextStyle(fontSize: 14)),
                ],
              ),
            ],
            if (adresse.isNotEmpty) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.location_on, size: 16, color: AppColors.mauve),
                  const SizedBox(width: 8),
                  Expanded(child: Text(adresse, style: const TextStyle(fontSize: 14))),
                ],
              ),
            ],
            const Divider(height: 24),
            Row(
              children: [
                _buildInfoItem('Fonction', fonction.toString()),
                const SizedBox(width: 16),
                _buildInfoItem('Buchettes', buchettes.toString()),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoItem(String label, String value) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              color: AppColors.textMuted,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProofCard(int index, dynamic proof) {
    final title = proof['title'] ?? 'Preuve ' + index.toString();
    final filePath = proof['file_path'] ?? '';
    final fileSize = proof['file_size'] ?? 0;
    final mimeType = proof['mime_type'] ?? '';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.mauveSoft,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(
                Icons.picture_as_pdf,
                color: AppColors.mauve,
                size: 28,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    (fileSize / 1024).toStringAsFixed(1) + ' Ko - ' + mimeType,
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.textMuted,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // BADGE PREUVES IMPORTEES
  Widget _buildProofsBadge() {
    final hasProofs = _proofs.isNotEmpty;
    final color = hasProofs
        ? AppColors.success
        : (_isRAS ? AppColors.warning : AppColors.danger);
    final icon = hasProofs
        ? Icons.check_circle
        : (_isRAS ? Icons.info_outline : Icons.warning_amber);
    final label = hasProofs
        ? 'OUI - ${_proofs.length} document(s)'
        : (_isRAS ? 'NON - Compte RAS (pas obligatoire)' : 'NON - Aucun document');

    return Container(
      margin: const EdgeInsets.only(top: 16, bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color, width: 1.5),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 28),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Preuves de formation importees',
                  style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                ),
                const SizedBox(height: 4),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ============================================================
  // LISTE DES DOCUMENTS CLIQUABLES
  // ============================================================
  Widget _buildProofsList() {
    if (_proofs.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 12),
        const Text(
          'Documents joints (cliquez pour voir) :',
          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 8),
        ..._proofs.asMap().entries.map((entry) {
          final idx = entry.key;
          final p = entry.value;
          final title = (p['title'] ?? p['file_name'] ?? 'Document ${idx + 1}').toString();
          final fileSize = (p['file_size'] ?? 0) as num;
          final filePath = (p['file_path'] ?? '').toString();

          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.mauve.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.picture_as_pdf,
                  color: AppColors.mauve,
                  size: 24,
                ),
              ),
              title: Text(
                title,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              subtitle: Text(
                '${(fileSize / 1024).toStringAsFixed(1)} Ko',
                style: const TextStyle(fontSize: 11),
              ),
              trailing: IconButton(
                icon: const Icon(Icons.open_in_new, color: AppColors.mauve),
                tooltip: 'Voir le document',
                onPressed: () => _openDocument(filePath),
              ),
              onTap: () => _openDocument(filePath),
            ),
          );
        }).toList(),
      ],
    );
  }

  // ============================================================
  // OUVRIR UN DOCUMENT
  // ============================================================
  void _openDocument(String filePath) {
    if (filePath.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Chemin du document introuvable')),
      );
      return;
    }

    final url = filePath.startsWith('http')
        ? filePath
        : 'https://chefunitplus-v1-0.onrender.com$filePath';

    Clipboard.setData(ClipboardData(text: url));

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Document'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Lien du document :', style: TextStyle(fontSize: 12)),
              const SizedBox(height: 8),
              SelectableText(
                url,
                style: const TextStyle(fontSize: 11, color: Colors.blue),
              ),
              const SizedBox(height: 12),
              const Text(
                'Le lien est copie dans le presse-papier. Collez-le dans un nouvel onglet pour voir le document.',
                style: TextStyle(fontSize: 11, color: AppColors.textMuted),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Fermer'),
          ),
        ],
      ),
    );
  }

  Widget _buildActionBar() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton.icon(
              onPressed: _processing ? null : _reject,
              icon: const Icon(Icons.close, size: 18),
              label: const Text('Rejeter'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.danger,
                side: const BorderSide(color: AppColors.danger),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: ElevatedButton.icon(
                onPressed: _processing
                    ? null
                    : ((_isRAS || _proofs.isNotEmpty) ? _validate : null),
              icon: _processing
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2,
                      ),
                    )
                  : const Icon(Icons.check, size: 18),
              label: const Text('Valider'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.success,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // =============================================================
  // ADMIN ACTIONS : Statut + Régénérer code
  // =============================================================
  Widget _buildAdminActions() {
    return Card(
      margin: const EdgeInsets.all(16),
      color: Colors.blue.shade50,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('🔧 ADMIN ACTIONS', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 12),
            
            // Statut actuel
            Row(
              children: [
                const Text('Statut : ', style: TextStyle(fontWeight: FontWeight.w600)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.orange.shade100,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    (_user?['statut'] ?? 'inconnu').toString().toUpperCase(),
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            
            // Boutons
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _changeStatut,
                    icon: const Icon(Icons.edit),
                    label: const Text('Changer statut'),
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.orange),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _regenerateCode,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Régénérer code'),
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.purple),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _changeStatut() async {
    final statuses = ['pending', 'proofs_pending', 'pending_validation', 'validated', 'rejected', 'suspended'];
    final selected = await showDialog<String>(
      context: context,
      builder: (ctx) => SimpleDialog(
        title: const Text('Changer le statut'),
        children: statuses.map((s) => SimpleDialogOption(
          onPressed: () => Navigator.pop(ctx, s),
          child: Text(s),
        )).toList(),
      ),
    );

    if (selected == null) return;

    try {
      final api = context.read<ApiClient>();
      final resp = await api.patch('/auth/admin/users/${widget.userId}/status', body: {'statut': selected});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(resp['message'] ?? 'Statut mis à jour')),
        );
        _loadUserProofs();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur : $e')),
        );
      }
    }
  }

  Future<void> _regenerateCode() async {
    try {
      final api = context.read<ApiClient>();
      final resp = await api.post('/auth/admin/users/${widget.userId}/regenerate-code');
      if (mounted) {
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Nouveau code généré'),
            content: Text('Code : ${resp['code'] ?? '??'}\n\nCommuniquez-le à l''utilisateur.'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK')),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur : $e')),
        );
      }
    }
  }

}



