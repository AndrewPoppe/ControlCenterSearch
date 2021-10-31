# Control Center Search

## About

Control Center Search is a REDCap External Module that adds search functionality to the Control Center.

## Installation

Please install from the REDCap Repo

## Usage

Once enabled, it adds a search bar to the top of the left-side menu in the control center.

![](images/search_bar.png)

Type the phrase you'd like to search for, and the module filters the links in the left-side menu to include only the pages that contain that text.

![](images/searching.png)

*Note: Any spaces in the search term are replaced with wildcards to make the search a little more flexible (E.g., "The greatest" will find "**The** cake is my **greatest** joy")*

Every REDCap session, the module scrapes the control center. While it scrapes, the search is disabled. This should only take a few seconds. Searching will be immediately available on subsequent visits to the control center within the same session.

## Help

You may submit an issue on Github or email [Andrew Poppe](mailto:andrew.poppe@yale.edu)

