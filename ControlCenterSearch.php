<?php

namespace YaleREDCap\ControlCenterSearch;

use ExternalModules\AbstractExternalModule;

/**
 * Main EM Class
 */
class ControlCenterSearch extends AbstractExternalModule
{

    static $moduleString = "CC_Search";


    function storeText($text)
    {
        $this->removeLogs("message = ?", USERID);
        $this->log(USERID, [
            "text" => $text,
            "date" => time()
        ]);
    }

    function getText()
    {
        $storedTextRes = $this->queryLogs("SELECT text, date where message = ?", USERID);
        return $storedTextRes->fetch_assoc();
    }

    function isDateTooOld($dateString)
    {
        $date = intval($dateString);
        $nSeconds = 60 * 60 * 24 * 7;
        return (time() - $date) > $nSeconds;
    }



    function redcap_control_center()
    {
        $storedText = $this->getText();
        $this->initializeJavascriptModuleObject();
?>
        <div class="cc_menu_section" id='cc-search-container'>
            <div class="cc_menu_header">Control Center Search</div>
            <div class="cc_menu_item" id="cc-search-item">
                <i class="fas fa-search" style="color:#22224c;"></i>
                <input id="cc-search-searchInput" type="text" class="x-form-text x-form-field fs11" placeholder="Search Control Center"></input>
            </div>
        </div>


        <script type="text/javascript">
            window.controlCenterSearchModule = <?= $this->getJavascriptModuleObjectName() ?>;
            window.controlCenterSearchModule.cookie_name = "<?= $this::$moduleString ?>";
            window.controlCenterSearchModule.storeTextUrl = "<?= $this->getUrl("storeText.php") ?>";

            <?php if (isset($storedText) && !$this->isDateTooOld($storedText["date"])) { ?>
                window.controlCenterSearchModule.link_text = `<?= ($storedText["text"]) ?>`;
                window.controlCenterSearchModule.initialized = true;
            <?php } ?>
        </script>
        <script src="<?= $this->getUrl("searcher.js") ?>"></script>
        <link rel="stylesheet" href="<?= $this->getUrl("searcher.css") ?>">
<?php
    }
}
