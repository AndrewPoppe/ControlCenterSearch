<?php

namespace YaleREDCap\ControlCenterSearch;

use ExternalModules\AbstractExternalModule;

/**
 * @property \ExternalModules\Framework $framework
 * @see Framework
 */
class ControlCenterSearch extends AbstractExternalModule
{
    public function redcap_control_center()
    {
        $this->initializeJavascriptModuleObject();
        ?>
        <div class="cc_menu_section" id='cc-search-container'>
            <div class="cc_menu_header">Control Center Search</div>
            <div class="cc_menu_item" id="cc-search-item">
                <i class="fas fa-search" style="color:#22224c;"></i>
                <input id="cc-search-searchInput" type="text" class="x-form-text x-form-field fs11"
                    placeholder="Search Control Center"></input>
            </div>
        </div>
        <script type="text/javascript">
            window.controlCenterSearchModule = <?= $this->getJavascriptModuleObjectName() ?>;
        </script>
        <script defer src="<?= $this->getUrl("searcher.js") ?>"></script>
        <link rel="stylesheet" href="<?= $this->getUrl("searcher.css") ?>">
        <?php
    }

    public function redcap_module_ajax($action, $payload, $project_id, $record, $instrument, $event_id, $repeat_instance, $survey_hash, $response_id, $survey_queue_hash, $page, $page_full, $user_id, $group_id)
    {
        if ( !$this->framework->isSuperUser() ) {
            http_response_code(403);
            return;
        }
        try {
            $setting = $user_id . '_cc-search-link-data';
            if ( $action == "getLinkData" ) {
                if ( empty($_SESSION["cc-search-initiated"]) ) {
                    return '';
                }
                return $this->framework->getSystemSetting($setting) ?? '';
            } elseif ( $action == "storeLinkData" ) {
                $this->framework->setSystemSetting($setting, $payload["linkData"]);
                $_SESSION["cc-search-initiated"] = true;
            }
        } catch ( \Throwable $e ) {
            $this->framework->log('Error in redcap_module_ajax', [ 'error' => $e->getMessage() ]);
        }
    }
}